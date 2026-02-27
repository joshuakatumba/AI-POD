from django.urls import path
from tasks.views import TaskDetailView, TasksView

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
]