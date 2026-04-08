from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.shortcuts import get_object_or_404
from django.utils import timezone
from tasks.models import Task, TaskComment
from projects.models import Project
from tasks.permissions import IsProjectMemberForTaskScope
from tasks.serializers import (
    TaskCreateSerializer,
    TaskReadSerializer,
    TaskUpdateSerializer,
    TaskCommentCreateSerializer,
    TaskCommentReadSerializer,
    TaskCommentUpdateSerializer,
)

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
        project = get_object_or_404(Project, id=project_id)

        serializer = TaskCreateSerializer(
            data=request.data,
            context={"request": request, "project": project},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            TaskReadSerializer(serializer.save()).data,
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
        serializer.save()

        return Response(
            TaskReadSerializer(serializer.save()).data,
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