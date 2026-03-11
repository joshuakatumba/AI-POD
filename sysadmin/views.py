from django.shortcuts import get_object_or_404, render
from drf_yasg import openapi
from django.db.models import Q, Prefetch, Count, F
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from organizations.models import Membership, Organization
from sysadmin.models import AIModel
from sysadmin.serializers import AIModelCreateSerializer, AIModelDetailSerializer, AdminOrganizationSerializer, AdminForceDeleteOrganizationSerializer, SysAdminUserSerializer, SysAdminUserUpdateSerializer
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from sysadmin.permissions import IsSystemAdmin
from django.contrib.auth import get_user_model

from django.db import IntegrityError
from rest_framework.exceptions import ValidationError

User = get_user_model()


# ---------- Admin List Organisations ----------
class AdminOrganisationListView(generics.ListAPIView):
    serializer_class = AdminOrganizationSerializer
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    @swagger_auto_schema(
        operation_summary="Admin list organizations",
        operation_description="Returns all organizations. Accessible only to system admins or superusers.",
        responses={
            200: AdminOrganizationSerializer(many=True),
            401: "Authentication required",
            403: "Permission denied",
        },
        tags=["Admin - Organizations"],
    )
    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        for organisation in queryset:
            creator_id = organisation.created_by_id
            organisation.creator_membership = next(
                (m for m in organisation.prefetched_memberships if m.user_id == creator_id),
                None
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_queryset(self):
        return (
            Organization.objects
            .filter(is_deleted=False)
            .select_related("created_by")
            .annotate(member_count=Count("memberships"))
            .prefetch_related(
                Prefetch(
                    "memberships",
                    queryset=Membership.objects.select_related("user"),
                    to_attr="prefetched_memberships"
                )
            )
            .order_by("-created_at")
        )
    
# ---------- Admin Force Delete Organisation ----------
class AdminForceDeleteOrganisationView(generics.GenericAPIView):
    serializer_class = AdminForceDeleteOrganizationSerializer
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    @swagger_auto_schema(
        operation_summary="Admin force delete organization",
        operation_description=(
            "Allows a platform admin to force delete any organization. "
            "Soft deletes the org, all its memberships, projects, and tasks."
        ),
        request_body=AdminForceDeleteOrganizationSerializer,
        responses={
            200: "Organization force deleted successfully",
            400: "Already deleted or invalid request",
            401: "Authentication required",
            403: "Permission denied",
            404: "Organization not found",
        },
        tags=["Admin - Organizations"],
    )
    def delete(self, request, organization_id):
        # Step 1 — fetch the org, return 404 if it doesn't exist
        organization = get_object_or_404(Organization, id=organization_id)

        # Step 2 — block early if already deleted before even hitting the serializer
        if organization.is_deleted:
            return Response(
                {
                    "message": "This organization has already been deleted.",
                    "organization_id": str(organization.id),
                    "is_deleted_at": organization.is_deleted_at,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 3 — pass org into serializer via context
        serializer = self.get_serializer(
            data=request.data,
            context={
                "request": request,
                "organization": organization,
            }
        )

        # Step 4 — validate (checks deleted again inside serializer as safety net)
        serializer.is_valid(raise_exception=True)

        # Step 5 — perform the cascade soft delete
        deleted_organization = serializer.delete()

        return Response(
            {
                "message": "organization.force_delete_success",
                "organization_id": str(deleted_organization.id),
                "organization_name": deleted_organization.name,
                "deleted_by": request.user.email,
                "is_deleted_at": deleted_organization.is_deleted_at,
            },
            status=status.HTTP_200_OK,
        )


class SysAdminUsersView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]
    serializer_class = SysAdminUserSerializer

    @swagger_auto_schema(
        operation_summary="Admin list users",
        operation_description="Returns all users. Accessible only to system admins or superusers.",
        responses={
            200: SysAdminUserSerializer(many=True),
            401: "Authentication required",
            403: "Permission denied",
        },
        tags=["Admin - Users"],
    )
    def get(self, request):
        memberships_qs = (
            Membership.objects
            .select_related("organization")
            .order_by(
                F("last_accessed_at").desc(nulls_last=True),
                "joined_at",
            )
        )

        users = (
            User.objects
            .all()
            .prefetch_related(
                Prefetch(
                    "organisation_memberships",
                    queryset=memberships_qs,
                    to_attr="prefetched_memberships",
                )
            )
        )

        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SysAdminUsersDetailsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]
    serializer_class = SysAdminUserSerializer

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return SysAdminUserUpdateSerializer
        return None

    @swagger_auto_schema(
        operation_description="Update a user's active status or admin role.",
        request_body=SysAdminUserUpdateSerializer,
        responses={
            200: SysAdminUserUpdateSerializer,
            401: "Authentication required",
            403: "Super admin permission required",
            404: "User not found",
        },
        manual_parameters=[
            openapi.Parameter(
                "user_id",
                openapi.IN_PATH,
                description="User UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True,
            ),
        ],
        tags=["Admin - Users"],
    )
    def patch(self, request, user_id):
        user = get_object_or_404(User, id=user_id)

        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

         # Serialize the updated instance
        response_serializer = SysAdminUserSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

# ---------- Admin AI Models View  ----------
class AIModelsApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AIModelCreateSerializer
        return AIModelDetailSerializer

    def get_queryset(self):
        queryset = AIModel.objects.all().order_by("-created_at")

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(provider__icontains=search) |
                Q(reference__icontains=search)
            )

        return queryset

    @swagger_auto_schema(
        operation_description="Create a new AI model configuration.",
        request_body=AIModelCreateSerializer,
        responses={
            201: AIModelDetailSerializer(),
            400: openapi.Response(description="Bad request - validation error"),
            401: openapi.Response(description="Authentication required"),
            500: openapi.Response(description="Internal server error"),
        },
        tags=["Admin - AI Models"],
    )
    def post(self, request, *args, **kwargs):
        """Create an AI model"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            instance = serializer.save()
            response_serializer = AIModelDetailSerializer(instance)

            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response(
                {"detail": "Validation error", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError:
            return Response(
                {"detail": "AI model with these attributes already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            return Response(
                {"detail": "An unexpected error occurred."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_description="List AI models.",
        manual_parameters=[
            openapi.Parameter(
                "search",
                openapi.IN_QUERY,
                "Search by name, provider, or reference",
                type=openapi.TYPE_STRING
            ),
        ],
        responses={
            200: AIModelDetailSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
        },
        tags=["Admin - AI Models"],
    )
    def get(self, request, *args, **kwargs):
        """List AI models with search"""
        queryset = self.get_queryset()
        serializer = AIModelDetailSerializer(queryset, many=True)
        return Response(serializer.data)
