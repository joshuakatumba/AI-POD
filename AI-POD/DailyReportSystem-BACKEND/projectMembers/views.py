from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from drf_yasg import openapi
from django.db.models import Q
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from django.utils import timezone

from projectMembers.models import ProjectMember
from projectMembers.serializers import ProjectMemberCreateSerializer, ProjectMemberReadSerializer, ProjectMemberUpdateSerializer
from projectMembers.permissions import CanCreateProjectMember, CanUpdateProjectMember, CanViewProjectMembers

class ProjectMembersApiView(generics.GenericAPIView):

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectMemberCreateSerializer
        return ProjectMemberReadSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanCreateProjectMember()]
        elif self.request.method == "GET":
            return [IsAuthenticated(), CanViewProjectMembers()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        auth = self.request.auth or {}
        organisation_id = auth.get("organisation_id")
        project_id = self.kwargs.get("project_id")

        queryset = ProjectMember.objects.filter(
            project_id=project_id,
            organisation_id=organisation_id,
            is_deleted=False,
        ).select_related("membership", "membership__user").order_by("-created_at")

        # --- Apply search ---
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(membership__display_name__icontains=search) | 
                Q(membership__user__email__icontains=search)
            )
        return queryset

    @swagger_auto_schema(
        operation_description="Add a member to a project.",
        request_body=ProjectMemberCreateSerializer,
        responses={
            201: ProjectMemberCreateSerializer,
            400: openapi.Response(description="Bad request - validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Permission denied - user cannot add members"),
        },
        tags=["Project Members"],
    )
    def post(self, request, project_id):
        """Add a member to a project"""
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request, "view": self},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_description="List all members in a project.",
        manual_parameters=[
            openapi.Parameter("search", openapi.IN_QUERY, description="Search by member name or email", type=openapi.TYPE_STRING),
        ],
        responses={
            200: ProjectMemberReadSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
            404: openapi.Response(description="Project not found"),
        },
        tags=["Project Members"],
    )
    def get(self, request, project_id):
        """List all members in a project"""
        queryset = self.get_queryset()
        serializer = ProjectMemberReadSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class ProjectMemberDetailApiView(generics.GenericAPIView):
    """
    API view for individual project member operations.
    Currently supports: PATCH (update role/status)
    Future: GET (retrieve), DELETE (remove member)
    """
    lookup_field = "id"

    def get_serializer_class(self):
        return ProjectMemberUpdateSerializer

    def get_permissions(self):
        if self.request.method in ["PATCH", "DELETE"]:
            return [IsAuthenticated(), CanCreateProjectMember(), CanUpdateProjectMember()]  # Only admins can update
        return [IsAuthenticated()]

    def get_queryset(self):
        """Return project members for the given project"""
        auth = self.request.auth or {}
        organisation_id = auth.get("organisation_id")
        project_id = self.kwargs.get("project_id")

        return ProjectMember.objects.filter(
            project_id=project_id,
            organisation_id=organisation_id,
            is_deleted=False,
        ).select_related("membership", "membership__user")

    def get_object(self):
        """Get project member or 404"""
        from django.shortcuts import get_object_or_404
        queryset = self.get_queryset()
        member_id = self.kwargs.get("member_id")
        return get_object_or_404(queryset, id=member_id)

    @swagger_auto_schema(
        operation_description="Update a project member's role and/or status.",
        request_body=ProjectMemberUpdateSerializer,
        responses={
            200: ProjectMemberReadSerializer(),
            400: openapi.Response(description="Bad request - validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Permission denied - user cannot update members"),
            404: openapi.Response(description="Project member not found"),
        },
        tags=["Project Members"],
    )
    def patch(self, request, project_id, member_id):
        """Update project member role and/or status"""
        updated_project_member = self.get_object()
        serializer = self.get_serializer(updated_project_member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Return full details using read serializer
        response_serializer = ProjectMemberReadSerializer(updated_project_member)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    @swagger_auto_schema(
        operation_description="Remove a member from a project (soft delete).",
        responses={
            200: openapi.Response(
                description="Member removed successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "message": openapi.Schema(type=openapi.TYPE_STRING),
                        "member_id": openapi.Schema(type=openapi.TYPE_STRING),
                        "removed_by": openapi.Schema(type=openapi.TYPE_STRING),
                    }
                )
            ),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Permission denied - user cannot remove members"),
            404: openapi.Response(description="Project member not found"),
        },
        tags=["Project Members"],
    )
    def delete(self, request, project_id, member_id):
        """Remove member from project (soft delete)"""
        project_member = self.get_object()
        
        # Soft delete
        project_member.status = "inactive"
        project_member.is_active = False
        project_member.is_deleted = True
        project_member.is_deleted_at = timezone.now()
        project_member.is_deleted_by_email = request.user.email
        project_member.is_deleted_reason = "Removed by admin"
        project_member.save()
        
        return Response(
            {
                "message": f"Member successfully removed from project.",
                "member_id": str(project_member.id),
                "removed_by": request.user.email,
            },
            status=status.HTTP_200_OK,
        )