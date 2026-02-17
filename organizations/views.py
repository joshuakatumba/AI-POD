from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import generics, status

from organizations.models import Membership, Organization
from organizations.serializers import (
    OrganizationCreateSerializer,
    AddUserToOrganizationSerializer,
    OrganizationMembershipSerializer,
    RemoveUserFromOrganizationSerializer,
    ChangeMemberRoleAndNameSerializer,
)
from organizations.permissions import CanCreateOrganization
from organizations.utils import get_membership


# ---------- Create Organisation ----------
class OrganizationCreateView(CreateAPIView):
    serializer_class = OrganizationCreateSerializer
    permission_classes = [IsAuthenticated, CanCreateOrganization]

    @swagger_auto_schema(
        operation_description=(
            "Create a new organization. "
            "The authenticated user becomes an admin automatically. "
            "Optional `invited_members` allows inviting existing users by email."
        ),
        request_body=OrganizationCreateSerializer,
        responses={
            201: openapi.Response(description="Organization created successfully"),
            400: "Validation error",
            401: "Authentication required",
            403: "Permission denied",
        },
        tags=["Organizations"],
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        organization, invited_data = serializer.save()

        response_data = {
            "message": "organization.create_success",
            "data": {
                "id": str(organization.id),
                "name": organization.name,
                "type": organization.type,
                "description": organization.description,
                "email": organization.email,
                "country": organization.country,
            },
        }

        if invited_data.get("invited_members_added"):
            response_data["data"]["invited_members_added"] = invited_data[
                "invited_members_added"
            ]

        if invited_data.get("invited_members_failed"):
            response_data["data"]["invited_members_failed"] = invited_data[
                "invited_members_failed"
            ]

        return Response(response_data, status=status.HTTP_201_CREATED)


# ---------- Organisation Members (Add + Get Memberships) ----------
class OrganizationMembersView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AddUserToOrganizationSerializer
        return None

    @swagger_auto_schema(
        operation_description=(
            "Add a user to an organization by email. "
            "Only organization admins or superusers can add members."
        ),
        request_body=AddUserToOrganizationSerializer,
        responses={
            201: openapi.Response(description="User added successfully"),
            400: "Validation error",
            401: "Authentication required",
            403: "Permission denied",
            404: "Organization not found",
        },
        manual_parameters=[
            openapi.Parameter(
                "organization_id",
                openapi.IN_PATH,
                description="Organization UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True,
            ),
        ],
        tags=["Organizations"],
    )
    def post(self, request, organization_id):
        organization = get_object_or_404(Organization, id=organization_id)

        serializer = self.get_serializer(
            data=request.data,
            context={"request": request, "organization": organization},
        )
        serializer.is_valid(raise_exception=True)
        membership = serializer.save()

        return Response(
            {
                "message": "User added successfully",
                "user": membership.user.email,
                "role": membership.role,
            },
            status=status.HTTP_201_CREATED,
        )

    @swagger_auto_schema(
        operation_description="Retrieve all active members of an organization.",
        responses={
            200: OrganizationMembershipSerializer(many=True),
            401: "Authentication required",
            404: "Organization not found",
        },
        manual_parameters=[
            openapi.Parameter(
                "organization_id",
                openapi.IN_PATH,
                description="Organization UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True,
            ),
        ],
        tags=["Organizations"],
    )
    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, id=organization_id)

        memberships = (
            Membership.objects.filter(organization=organization)
            .select_related("user")
        )

        serializer = OrganizationMembershipSerializer(memberships, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ---------- Organisation Member (Delete + Change individual Membership) ----------
class OrganizationMemberView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "DELETE":
            return RemoveUserFromOrganizationSerializer
        elif self.request.method == "PATCH":
            return ChangeMemberRoleAndNameSerializer
        return None

    @swagger_auto_schema(
        operation_description=(
            "Update a member's role or display name. "
            "Users may update their own display name. "
            "Only admins can change roles. "
            "The last admin cannot be demoted."
        ),
        request_body=ChangeMemberRoleAndNameSerializer,
        responses={
            200: OrganizationMembershipSerializer,
            400: "Validation error",
            401: "Authentication required",
            403: "Permission denied",
            404: "Organization or membership not found",
        },
        manual_parameters=[
            openapi.Parameter(
                "organization_id",
                openapi.IN_PATH,
                description="Organization UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True,
            ),
            openapi.Parameter(
                "membership_id",
                openapi.IN_PATH,
                description="Membership UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True,
            ),
        ],
        tags=["Organizations"],
    )
    def patch(self, request, organization_id, membership_id):
        organization, membership = get_membership(
            organization_id, membership_id
        )

        serializer = self.get_serializer(
            data=request.data,
            context={
                "request": request,
                "organization": organization,
                "membership": membership,
            },
        )

        serializer.is_valid(raise_exception=True)
        updated_membership = serializer.update(
            membership, serializer.validated_data
        )

        message_parts = []
        if "role" in serializer.validated_data:
            message_parts.append(f"role updated to '{updated_membership.role}'")
        if "display_name" in serializer.validated_data:
            message_parts.append("display name updated")

        message = "Member " + " and ".join(message_parts) + " successfully"

        response_serializer = OrganizationMembershipSerializer(
            updated_membership
        )

        return Response(
            {
                "message": message,
                "data": response_serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        operation_description=(
            "Remove a member from an organization (soft delete). "
            "Only admins or superusers can remove members. "
            "Users cannot remove themselves. "
            "The last admin cannot be removed."
        ),
        responses={
            200: openapi.Response(description="User removed successfully"),
            400: "Validation error",
            401: "Authentication required",
            403: "Permission denied",
            404: "Organization or membership not found",
        },
        manual_parameters=[
            openapi.Parameter(
                "organization_id",
                openapi.IN_PATH,
                description="Organization UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True,
            ),
            openapi.Parameter(
                "membership_id",
                openapi.IN_PATH,
                description="Membership UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True,
            ),
        ],
        tags=["Organizations"],
    )
    def delete(self, request, organization_id, membership_id):
        organization, membership = get_membership(
            organization_id, membership_id
        )

        serializer = RemoveUserFromOrganizationSerializer(
            data={},
            context={
                "request": request,
                "organization": organization,
                "membership": membership,
            },
        )

        serializer.is_valid(raise_exception=True)
        deleted_membership = serializer.delete()

        return Response(
            {
                "message": (
                    f"User {deleted_membership.user.email} has been removed "
                    f"from organization {organization.name}."
                ),
                "membership_id": str(deleted_membership.id),
            },
            status=status.HTTP_200_OK,
        )
