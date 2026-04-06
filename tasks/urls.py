from django.urls import path
from tasks.views import TaskCommentDetailView, TaskDetailView, TaskCommentsView, TasksView

app_name = "tasks"

urlpatterns = [
    path(
        "<uuid:project_id>/tasks/",
        TasksView.as_view(),
        name="tasks",
    ),
    path(
        "<uuid:project_id>/tasks/<uuid:task_id>/",
        TaskDetailView.as_view(),
        name="task-detail",
    ),
    path(
        "tasks/<uuid:task_id>/comments/",
        TaskCommentsView.as_view(),
        name="task-comments",
    ),
    path(
        "tasks/<uuid:task_id>/comments/<uuid:comment_id>/",
        TaskCommentDetailView.as_view(),
        name="task-comment-detail",
    ),
]