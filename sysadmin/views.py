from django.shortcuts import render
from django.db.models import Prefetch, Count, F
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from organizations.models import Membership, Organization
from sysadmin.serializers import AdminOrganizationSerializer, AdminForceDeleteOrganizationSerializer, SysAdminUserSerializer
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from sysadmin.permissions import IsSystemAdmin
from django.contrib.auth import get_user_model

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
