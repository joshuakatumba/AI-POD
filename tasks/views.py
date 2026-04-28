from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from tasks.filters import TaskFilterSet
from tasks.helpers import queue_task_translation
from tasks.models import Task, TaskComment
from projects.models import Project
from tasks.pagination import TaskPagination
from tasks.permissions import IsProjectMemberForTaskScope
from tasks.serializers import (
    TaskCreateSerializer,
    TaskReadSerializer,
    TaskUpdateSerializer,
    TaskCommentCreateSerializer,
    TaskCommentReadSerializer,
    TaskCommentUpdateSerializer,
)


class AllTasksView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskReadSerializer
    pagination_class = TaskPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = TaskFilterSet

    def get_queryset(self):
        auth = self.request.auth or {}
        organisation_id = auth.get("organisation_id")

        return (
            Task.objects.filter(
                organisation_id=organisation_id,
                is_deleted=False,
            )
            .select_related(
                "organisation",
                "project",
                "reported_by",
                "assigned_to",
                "created_by",
            )
            .order_by("-created_at")
        )
    
    @swagger_auto_schema(
        operation_description="Get all tasks for the authenticated user's organisation.",
        manual_parameters=[
            openapi.Parameter("status", openapi.IN_QUERY, description="Filter by task status", type=openapi.TYPE_STRING, required=False,),
            openapi.Parameter("assigned_to", openapi.IN_QUERY, description="Filter by assigned ProjectMember ID (UUID)", type=openapi.TYPE_STRING, required=False,),openapi.Parameter("project",
            openapi.IN_QUERY, description="Filter by Project ID (UUID)", type=openapi.TYPE_STRING, required=False,),openapi.Parameter("high_priority", openapi.IN_QUERY, description="Filter high priority tasks (true/false)", type=openapi.TYPE_BOOLEAN, required=False,),
            openapi.Parameter("limit", openapi.IN_QUERY, description="Page size for pagination", type=openapi.TYPE_INTEGER, required=False,),
        ],
        responses={
            200: TaskReadSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
        },
        tags=["Tasks"],
    )
    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # apply django-filter manually (since GenericAPIView doesn't auto-run it)
        for backend in list(self.filter_backends):
            queryset = backend().filter_queryset(request, queryset, self)

        # pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        # fallback (no pagination)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class TasksView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsProjectMemberForTaskScope]
    serializer_class = TaskCreateSerializer

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
        project = get_object_or_404(Project, id=project_id)

        tasks = Task.objects.filter(project=project, is_deleted=False).select_related(
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
        project = get_object_or_404(Project, id=project_id)

        serializer = TaskCreateSerializer(
            data=request.data,
            context={"request": request, "project": project},
        )
        serializer.is_valid(raise_exception=True)
        task = serializer.save()

        # queue trigger translation
        queue_task_translation(task)

        return Response(
            TaskReadSerializer(task).data,
            status=status.HTTP_201_CREATED,
        )


class TaskDetailView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsProjectMemberForTaskScope]
    serializer_class = TaskUpdateSerializer
    
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
        project = get_object_or_404(Project, id=project_id)
        task = get_object_or_404(Task, id=task_id, project=project)

        serializer = TaskUpdateSerializer(
            task,
            data=request.data,
            partial=True,
            context={"request": request, "project": task.project},
        )
        serializer.is_valid(raise_exception=True)
        task = serializer.save()

        # queue trigger translation
        queue_task_translation(task)

        return Response(
            TaskReadSerializer(serializer.save()).data,
            status=status.HTTP_200_OK,
    )
    @swagger_auto_schema(
    operation_description="Delete a task (soft delete)",
    responses={
        200: openapi.Response(
            description="Task deleted",
            schema=openapi.Schema(
                type=openapi.TYPE_OBJECT,
                properties={
                    "detail": openapi.Schema(type=openapi.TYPE_STRING),
                    "task_id": openapi.Schema(type=openapi.TYPE_STRING),
                    "deleted_by": openapi.Schema(type=openapi.TYPE_STRING),
                },
            ),
        ),
        401: openapi.Response(description="Authentication required"),
        403: openapi.Response(description="Not a project member"),
        404: openapi.Response(description="Project or Task not found"),
    },
    tags=["Tasks"],
    )
    def delete(self, request, project_id, task_id, *args, **kwargs):
        project = get_object_or_404(Project, id=project_id)
        task = get_object_or_404(Task, id=task_id, project=project, is_deleted=False)

        # Soft delete
        task.status = "cancelled"
        task.is_active = False
        task.is_deleted = True
        task.is_deleted_at = timezone.now()
        task.is_deleted_by_email = request.user.email
        task.is_deleted_reason = "Removed by admin"
        task.save()
        return Response(
            {
                "detail": "Task successfully deleted.",
                "task_id": str(task.id),
                "deleted_by": request.user.email,
            },
        status=status.HTTP_200_OK,
    )


class TaskCommentsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsProjectMemberForTaskScope]
    serializer_class = TaskCommentCreateSerializer

    @swagger_auto_schema(
        operation_description="Get all comments on a task. Only project members can view comments.",
        responses={
            200: TaskCommentReadSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not a project member"),
            404: openapi.Response(description="Task not found"),
        },
        tags=["Task Comments"],
    )
    def get(self, request, task_id, *args, **kwargs):
        task = get_object_or_404(Task.objects.select_related("project"), id=task_id)

        comments = TaskComment.objects.filter(task=task, is_deleted=False)
        serializer = TaskCommentReadSerializer(comments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_description="Create a comment on a task. Only project members can comment.",
        request_body=TaskCommentCreateSerializer,
        responses={
            201: TaskCommentReadSerializer,
            400: openapi.Response(description="Validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not a project member"),
            404: openapi.Response(description="Task not found"),
        },
        tags=["Task Comments"],
    )
    def post(self, request, task_id, *args, **kwargs):
        serializer = TaskCommentCreateSerializer(
            data=request.data,
            context={
                "request": request,
                "task_id": task_id,
            },
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()

        return Response(TaskCommentReadSerializer(comment).data, status=status.HTTP_201_CREATED)


class TaskCommentDetailView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsProjectMemberForTaskScope]
    serializer_class = TaskCommentReadSerializer

    @swagger_auto_schema(
        operation_description="Get a single task comment. Only project members can view comments.",
        responses={
            200: TaskCommentReadSerializer,
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not a project member"),
            404: openapi.Response(description="Task or Comment not found"),
        },
        tags=["Task Comments"],
    )
    def get(self, request, task_id, comment_id, *args, **kwargs):
        task = get_object_or_404(Task.objects.select_related("project"), id=task_id)
        comment = get_object_or_404(TaskComment, id=comment_id, task=task, is_deleted=False)

        return Response(TaskCommentReadSerializer(comment).data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_description="Update a task comment. Only project members who authored the comment can update it.",
        request_body=TaskCommentUpdateSerializer,
        responses={
            200: TaskCommentReadSerializer,
            400: openapi.Response(description="Validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not a project member or not the comment author"),
            404: openapi.Response(description="Task or Comment not found"),
        },
        tags=["Task Comments"],
    )
    def patch(self, request, task_id, comment_id, *args, **kwargs):
        task = get_object_or_404(Task.objects.select_related("project"), id=task_id)
        comment = get_object_or_404(TaskComment, id=comment_id, task=task, is_deleted=False)
        self.check_object_permissions(request, comment)

        serializer = TaskCommentUpdateSerializer(
            comment,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(TaskCommentReadSerializer(comment).data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_description="Soft delete a task comment. Only project members who authored the comment can delete it.",
        responses={
            200: openapi.Response(
                description="Comment deleted",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        "message": openapi.Schema(type=openapi.TYPE_STRING),
                        "comment_id": openapi.Schema(type=openapi.TYPE_STRING),
                        "removed_by": openapi.Schema(type=openapi.TYPE_STRING),
                    },
                ),
            ),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not a project member or not the comment author"),
            404: openapi.Response(description="Task or Comment not found"),
        },
        tags=["Task Comments"],
    )
    def delete(self, request, task_id, comment_id, *args, **kwargs):
        task = get_object_or_404(Task.objects.select_related("project"), id=task_id)
        comment = get_object_or_404(TaskComment, id=comment_id, task=task, is_deleted=False)
        self.check_object_permissions(request, comment)

        # Soft delete to preserve audit history.
        comment.is_active = False
        comment.is_deleted = True
        comment.is_deleted_at = timezone.now()
        comment.is_deleted_by_email = request.user.email
        comment.is_deleted_reason = "Removed by author"
        comment.save()
        return Response(
            {
                "message": "Comment successfully removed from task.",
                "comment_id": str(comment.id),
                "removed_by": request.user.email,
            },
            status=status.HTTP_200_OK,
        )