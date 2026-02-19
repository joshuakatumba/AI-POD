from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from drf_yasg import openapi
from django.db.models import Q
from drf_yasg.utils import swagger_auto_schema

from projectMembers.models import ProjectMember
from projectMembers.serializers import ProjectMemberCreateSerializer, ProjectMemberReadSerializer
from projectMembers.permissions import CanCreateProjectMember, CanViewProjectMembers

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
    