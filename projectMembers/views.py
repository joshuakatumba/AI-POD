from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from drf_yasg import openapi
from django.db.models import Q
from drf_yasg.utils import swagger_auto_schema

from projectMembers.models import ProjectMember
from projectMembers.serializers import ProjectMemberCreateSerializer
from projectMembers.permissions import CanCreateProjectMember

class ProjectMembersApiView(generics.GenericAPIView):

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectMemberCreateSerializer
        return ProjectMemberCreateSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanCreateProjectMember()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        auth = self.request.auth or {}
        project_id = auth.get("project_id")

        queryset = ProjectMember.objects.filter(
            project_id=project_id,
            is_deleted=False,
        ).order_by("-created_at")

        # --- Apply search ---
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
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
