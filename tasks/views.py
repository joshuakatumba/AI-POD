from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound

from projects.models import Project
from projectMembers.models import ProjectMember
from .serializers import TaskCreateSerializer, TaskReadSerializer


class TasksView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskCreateSerializer

    def get_project(self, project_id):
        try:
            return Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            raise NotFound("Project not found.")

    def get_requester_membership(self, user, project):
        try:
            return ProjectMember.objects.get(membership__user=user, project=project)
        except ProjectMember.DoesNotExist:
            raise PermissionDenied("You must be a member of this project to create tasks.")

    @swagger_auto_schema(
        operation_description="Create a new task in a project. Only project members can create tasks.",
        request_body=TaskCreateSerializer,
        responses={
            201: TaskReadSerializer,
            400: openapi.Response(description="Validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not a project member"),
            404: openapi.Response(description="Project not found"),
        },
        tags=["Tasks"],
    )
    def post(self, request, project_id, *args, **kwargs):
        project = self.get_project(project_id)
        self.get_requester_membership(request.user, project)  # enforces membership

        serializer = TaskCreateSerializer(
            data=request.data,
            context={"request": request, "project": project},
        )
        serializer.is_valid(raise_exception=True)
        task = serializer.save()

        return Response(
            TaskReadSerializer(task).data,
            status=status.HTTP_201_CREATED,
        )
