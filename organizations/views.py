from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied

from organizations.models import Membership, Organization
from organizations.serializers import (
    OrganizationCreateSerializer,
    AddUserToOrganizationSerializer,
    OrganizationMembershipSerializer,
    RemoveUserFromOrganizationSerializer,
)
from organizations.permissions import CanCreateOrganization
from organizations.utils import get_membership 


# ---------- Create Organisation ----------
class OrganizationCreateView(CreateAPIView):
    serializer_class = OrganizationCreateSerializer
    permission_classes = [IsAuthenticated, CanCreateOrganization]

    @swagger_auto_schema(
        operation_description="Create a new organization. The creator automatically becomes an admin of the organization.",
        request_body=OrganizationCreateSerializer,
        responses={
            201: openapi.Response(
                description="Organization created successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "message": openapi.Schema(type=openapi.TYPE_STRING, description="Success message"),
                        "data": openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            description="Created organization data",
                            properties={
                                "id": openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID),
                                "name": openapi.Schema(type=openapi.TYPE_STRING),
                                "type": openapi.Schema(type=openapi.TYPE_STRING),
                                "description": openapi.Schema(type=openapi.TYPE_STRING),
                                "email": openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_EMAIL),
                                "country": openapi.Schema(type=openapi.TYPE_STRING),
                            }
                        )
                    }
                )
            ),
            400: openapi.Response(description="Bad request - validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Permission denied - user cannot create organizations"),
        },
        tags=["Organizations"],
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "message": "organization.create_success",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


# ---------- Organisation Members (Add + Get Memberships) ----------
class OrganizationMembersView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AddUserToOrganizationSerializer
        return None

    @swagger_auto_schema(
        operation_description="Add a user to an organization by email. Only organization admins or superusers can add members.",
        request_body=AddUserToOrganizationSerializer,
        responses={
            201: openapi.Response(
                description="User added successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "message": openapi.Schema(type=openapi.TYPE_STRING, description="Success message"),
                        "user": openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_EMAIL, description="Email of added user"),
                        "role": openapi.Schema(type=openapi.TYPE_STRING, description="Role assigned to user"),
                    }
                )
            ),
            400: openapi.Response(description="Bad request - validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Permission denied - user is not admin of organization"),
            404: openapi.Response(description="Organization not found"),
        },
        manual_parameters=[
            openapi.Parameter(
                'organization_id',
                openapi.IN_PATH,
                description="Organization UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True
            ),
        ],
        tags=["Organizations"],
    )
    def post(self, request, organization_id):
        """Add user to organization"""
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
                "role": membership.role
             },
            status=status.HTTP_201_CREATED
        )
    
    @swagger_auto_schema(
        operation_description="Get all members of an organization.",
        responses={
            200: openapi.Response(
                description="List of organization members",
                schema=OrganizationMembershipSerializer(many=True)
            ),
            401: openapi.Response(description="Authentication required"),
            404: openapi.Response(description="Organization not found"),
        },
        manual_parameters=[
            openapi.Parameter(
                'organization_id',
                openapi.IN_PATH,
                description="Organization UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True
            ),
        ],
        tags=["Organizations"],
    )
    def get(self, request, organization_id):
        organization = get_object_or_404(Organization, id=organization_id)

        memberships = Membership.objects.filter(
            organization=organization
        ).select_related("user")

        serializer = OrganizationMembershipSerializer(memberships, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ---------- Organisation Member (Delete + Update individual Membership) ----------
class OrganizationMemberView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "DELETE":
            return RemoveUserFromOrganizationSerializer
        return None
    

    @swagger_auto_schema(
        operation_description="Remove a user from an organization (soft delete). Only organization admins or superusers can remove members. Users cannot remove themselves. Cannot remove the last admin of an organization.",
        responses={
            200: openapi.Response(
                description="User removed successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "message": openapi.Schema(type=openapi.TYPE_STRING, description="Success message"),
                        "membership_id": openapi.Schema(type=openapi.TYPE_STRING, format=openapi.FORMAT_UUID, description="ID of the deleted membership"),
                    }
                )
            ),
            400: openapi.Response(description="Bad request - validation error (e.g., trying to remove yourself, trying to remove last admin)"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Permission denied - user is not admin of organization"),
            404: openapi.Response(description="Organization or membership not found"),
        },
        manual_parameters=[
            openapi.Parameter(
                'organization_id',
                openapi.IN_PATH,
                description="Organization UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True
            ),
            openapi.Parameter(
                'membership_id',
                openapi.IN_PATH,
                description="Membership UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True
            ),
        ],
        tags=["Organizations"],
    )
    def delete(self, request, organization_id, membership_id):
        """Remove user from organization using serializer"""
        organization, membership = get_membership(organization_id, membership_id)

        serializer = RemoveUserFromOrganizationSerializer(
            data={},
            context={
                "request": request,
                "organization": organization,
                "membership": membership
            }
        )
        
        serializer.is_valid(raise_exception=True)
        deleted_membership = serializer.delete()

        return Response(
            {
                "message": f"User {deleted_membership.user.email} has been removed from organization {organization.name}.",
                "membership_id": str(deleted_membership.id),
            },
            status=status.HTTP_200_OK,
        )
