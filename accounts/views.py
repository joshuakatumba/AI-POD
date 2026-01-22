from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate
from .serializers import UserSignUpSerializer, TenantSelectSerializer, LoginSerializer
from organizations.models import Membership
from .utils import get_jwt_for_membership
from django.utils.timezone import now

class SignUpView(APIView):
    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        request_body=UserSignUpSerializer,
        responses={201: openapi.Response('User created successfully.')}
    )
    def post(self, request):
        serializer = UserSignUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({"message": "User created successfully."}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        request_body=LoginSerializer,
        responses={
            200: openapi.Response(
                description="Successful login",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "user_id": openapi.Schema(type=openapi.TYPE_STRING),
                        "email": openapi.Schema(type=openapi.TYPE_STRING),
                        "tenant": openapi.Schema(type=openapi.TYPE_STRING),
                        "role": openapi.Schema(type=openapi.TYPE_STRING),
                        "tokens": openapi.Schema(type=openapi.TYPE_OBJECT),
                    }
                )
            ),
            401: openapi.Response("Invalid credentials"),
            403: openapi.Response("No active tenant memberships found"),
        },
        operation_description="Login endpoint. Returns JWT tokens and tenant info."
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

        # Get last-used membership
        membership = (
            Membership.objects.filter(user=user, is_active=True)
            .order_by("-last_accessed_at", "joined_at")
            .first()
        )

        if not membership:
            return Response({"detail": "No active tenant memberships found."}, status=status.HTTP_403_FORBIDDEN)

        # Update last_accessed_at
        membership.last_accessed_at = now()
        membership.save(update_fields=["last_accessed_at"])

        token = get_jwt_for_membership(user, membership)

        return Response({
            "user_id": str(user.id),
            "email": user.email,
            "tenant": str(membership.organization_id),
            "role": membership.role,
            "tokens": token
        })


class SwitchTenantView(APIView):
    """
    Switch tenant for user and get new JWT
    """
    def post(self, request):
        serializer = TenantSelectSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        tenant_id = serializer.validated_data["tenant_id"]

        membership = Membership.objects.get(user=request.user, organization_id=tenant_id)

        # Update last_accessed_at
        membership.last_accessed_at = now()
        membership.save(update_fields=["last_accessed_at"])

        token = get_jwt_for_membership(request.user, membership)
        return Response({
            "tenant": str(membership.organization_id),
            "role": membership.role,
            "tokens": token
        })
