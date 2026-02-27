from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound

from projects.models import Project
from tasks.models import Task
from projectMembers.models import ProjectMember
from .serializers import TaskCreateSerializer, TaskReadSerializer, TaskUpdateSerializer
from .serializers import TaskCreateSerializer, TaskReadSerializer
from .models import Task
from .serializers import TaskCreateSerializer, TaskReadSerializer, TaskUpdateSerializer

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
            raise PermissionDenied("You must be a member of this project to view or create tasks.")

    @swagger_auto_schema(
        operation_description="Get all tasks in a project. Only project members can view tasks.",
        manual_parameters=[
            openapi.Parameter(
                "status",
                openapi.IN_QUERY,
                description="Filter tasks by status (e.g. backlog, in_progress, closed)",
                type=openapi.TYPE_STRING,
                required=False,
            ),
            openapi.Parameter(
                "assigned_to",
                openapi.IN_QUERY,
                description="Filter tasks by assigned ProjectMember ID (UUID)",
                type=openapi.TYPE_STRING,
                required=False,
            ),
        ],
        responses={
            200: TaskReadSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not a project member"),
            404: openapi.Response(description="Project not found"),
        },
        tags=["Tasks"],
    )
    def get(self, request, project_id, *args, **kwargs):
        project = self.get_project(project_id)
        self.get_requester_membership(request.user, project)

        tasks = Task.objects.filter(project=project).select_related(
            "organisation",
            "project",
            "reported_by",
            "assigned_to",
            "created_by",
        )

        status_filter = request.query_params.get("status")
        if status_filter:
            tasks = tasks.filter(status=status_filter)

        assigned_to_filter = request.query_params.get("assigned_to")
        if assigned_to_filter:
            tasks = tasks.filter(assigned_to__id=assigned_to_filter)

        serializer = TaskReadSerializer(tasks, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

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
        self.get_requester_membership(request.user, project)

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

class TaskDetailView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskUpdateSerializer

    def get_project(self, project_id):
        try:
            return Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            raise NotFound("Project not found.")
        
    def get_requester_membership(self, user, project):
        try:
            return ProjectMember.objects.get(membership__user=user, project=project)
        except ProjectMember.DoesNotExist:
            raise PermissionDenied("You must be a member of this project to view or modify tasks.")
        
    def get_task(self, task_id, project):
        try:
            return Task.objects.get(id=task_id, project=project)
        except Task.DoesNotExist:
            raise NotFound("Task not found.")
    
    @swagger_auto_schema(
        operation_description="Update an existing task. Only project members can update tasks.",
        request_body=TaskUpdateSerializer,
        responses={
            200: TaskReadSerializer,
            400: openapi.Response(description="Validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not a project member"),
            404: openapi.Response(description="Project or Task not found"),
        },
        tags=["Tasks"],
    )
    def patch(self, request, project_id, task_id, *args, **kwargs):
        project = self.get_project(project_id)
        self.get_requester_membership(request.user, project)
        task = self.get_task(task_id, project)

        serializer = TaskUpdateSerializer(
            task,
            data=request.data,
            partial=True,
            context={"request": request, "project": project},
        )
        serializer.is_valid(raise_exception=True)
        updated_task = serializer.save()

        return Response(
            TaskReadSerializer(updated_task).data,
            status=status.HTTP_200_OK,
        )