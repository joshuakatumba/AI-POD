from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.contrib.auth.tokens import default_token_generator
from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.exceptions import ValidationError
from django.contrib.auth import authenticate, get_user_model
from .serializers import LoginResponseSerializer, LogoutSerializer, OrganisationSelectResponseSerializer, UserInfoSerializer, UserSignUpSerializer, OrganisationSelectSerializer, LoginSerializer, PasswordResetRequestSerializer
from organizations.models import Membership
from .utils import get_jwt_for_membership
from .helpers import send_password_reset_email
from django.utils.timezone import now
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

User = get_user_model()

class SignUpView(APIView):
    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        operation_description="Authenticate user and get access token",
        request_body=UserSignUpSerializer,
        responses={201: openapi.Response('User created successfully.')},
        tags=["Auth"],
    )
    def post(self, request):
        try:
            serializer = UserSignUpSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
            return Response(
                {"message": "User created successfully."},
                status=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            # Already handled by DRF, but you can customize response if needed
            return Response(
                {"errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Catch unexpected errors
            return Response(
                {"error": "Something went wrong. Please try again.", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        operation_description="Request a password reset.",
        request_body=PasswordResetRequestSerializer,
        responses={
            200: openapi.Response("Password reset request accepted."),
            404: openapi.Response("No account found for this email."),
        },
        tags=["Auth"],
    )
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = get_object_or_404(
            User,
            email__iexact=serializer.validated_data["email"],
            is_active=True,
        )

        reset_token = default_token_generator.make_token(user)

        try:
            send_password_reset_email(user, reset_token)
        except Exception as e:
            return Response(
                {"detail": f"An error occurred while sending the email. {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Password reset request accepted."},
            status=status.HTTP_200_OK,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        request_body=LoginSerializer,
        responses={
            200: openapi.Response(
                description="Successful login",
                schema=LoginResponseSerializer
            ),
            401: openapi.Response(description="Invalid credentials"),
            403: openapi.Response(description="No active organisation memberships found"),
        },
        operation_description="Login endpoint. Returns JWT tokens and organisation info.",
        tags=["Auth"],
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"]
        )

        if not user:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        
        memberships_qs = (
            Membership.objects
            .filter(user=user, is_active=True)
            .order_by(
                F("last_accessed_at").desc(nulls_last=True),
                "joined_at"
            )
        )

        if not memberships_qs.exists():
            return Response(
                {"detail": "You have not been invited to an organization and cannot access the system."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # First one = most recent → current organisation
        current_membership = memberships_qs.first()
        memberships_data = []
        for m in memberships_qs:
            memberships_data.append({
                "id": str(m.id),
                "organization_id": str(m.organization_id),
                "organization_name": m.organization.name,
                "display_name": m.display_name,
                "role": m.role,
                "is_current": m.id == current_membership.id,
                "preferred_language": m.preferred_language,
                "joined_at": m.joined_at,
                "last_accessed_at": m.last_accessed_at,
            })

        if not current_membership:
            return Response({"detail": "No active organisation memberships found."}, status=status.HTTP_403_FORBIDDEN)

        # Update last_accessed_at
        current_membership.last_accessed_at = now()
        current_membership.save(update_fields=["last_accessed_at"])

        token = get_jwt_for_membership(user, current_membership)

        return Response({
            "user_id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "super_admin": user.is_superuser,
            "is_staff": user.is_staff,
            "preferred_language": user.preferred_language,
            "organisation": str(current_membership.organization_id),
            "membership": str(current_membership.id),
            "role": current_membership.role,
            "tokens": token,
            "memberships": memberships_data,
        })


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        request_body=LogoutSerializer,
        responses={
            200: openapi.Response(description="Successfully logged out"),
            400: openapi.Response(description="Invalid or expired token"),
        },
        operation_description="Logout endpoint. Blacklists the refresh token.",
        tags=["Auth"],
    )
    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            refresh_token = serializer.validated_data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({"detail": "Successfully logged out"}, status=status.HTTP_200_OK)

        except TokenError:
            return Response(
                {"detail": "Invalid or expired token"},
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        responses={
            200: openapi.Response(
                description="Authenticated user info with memberships",
                schema=UserInfoSerializer,
            ),
            401: openapi.Response(description="Not authenticated"),
        },
        operation_description="Returns the current user info and all memberships. The current organisation is inferred from most recently accessed membership.",
        tags=["Auth"],
    )
    def get(self, request):
        user = request.user

        memberships_qs = (
            Membership.objects
            .filter(user=user, is_active=True)
            .order_by(
                F("last_accessed_at").desc(nulls_last=True),
                "joined_at"
            )
        )

        if not memberships_qs.exists():
            return Response(
                {"detail": "No memberships found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # First one = most recent → current organisation
        current_membership = memberships_qs.first()

        memberships_data = []
        for m in memberships_qs:
            memberships_data.append({
                "id": str(m.id),
                "organization_id": str(m.organization_id),
                "organization_name": m.organization.name,
                "display_name": m.display_name,
                "role": m.role,
                "is_current": m.id == current_membership.id,
                "joined_at": m.joined_at,
                "last_accessed_at": m.last_accessed_at,
            })

        return Response({
            "user_id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "super_admin": user.is_superuser,
            "is_staff": user.is_staff,
            "preferred_language": user.preferred_language,
            "super_user": user.is_superuser,
            "memberships": memberships_data,
        })


class SwitchOrganizationView(APIView):
    """
    Switch organisation for user and get new JWT
    """
    @swagger_auto_schema(
        request_body=OrganisationSelectSerializer,
        responses={
            200: openapi.Response(
                description="Successful switched organization",
                schema=OrganisationSelectResponseSerializer,
            ),
            401: openapi.Response(description="Invalid credentials"),
            403: openapi.Response(description="No active organisation memberships found"),
        },
        operation_description="Login endpoint. Returns JWT tokens and organisation info.",
        tags=["Auth"],
    )
    def post(self, request):
        serializer = OrganisationSelectSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        organisation_id = serializer.validated_data["organisation_id"]

        current_membership = Membership.objects.get(user=request.user, organization_id=organisation_id)

        current_membership.last_accessed_at = now()
        current_membership.save(update_fields=["last_accessed_at"])

        token = get_jwt_for_membership(request.user, current_membership)

        memberships_qs = (
            Membership.objects
            .filter(user=request.user, is_active=True)
            .order_by(
                F("last_accessed_at").desc(nulls_last=True),
                "joined_at"
            )
        )

        memberships_data = []
        for m in memberships_qs:
            memberships_data.append({
                "id": str(m.id),
                "organization_id": str(m.organization_id),
                "organization_name": m.organization.name,
                "display_name": m.display_name,
                "role": m.role,
                "is_current": m.id == current_membership.id,
                "preferred_language": m.preferred_language,
                "joined_at": m.joined_at,
                "last_accessed_at": m.last_accessed_at,
            })

        return Response({
            "user_id": str(request.user.id),
            "email": request.user.email,
            "full_name": request.user.full_name,
            "super_admin": request.user.is_superuser,
            "is_staff": request.user.is_staff,
            "preferred_language": request.user.preferred_language,
            "organisation": str(current_membership.organization_id),
            "membership": str(current_membership.id),
            "role": current_membership.role,
            "tokens": token,
            "memberships": memberships_data
        })
