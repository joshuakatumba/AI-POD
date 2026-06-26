from django.urls import path
from tasks.views import AllTasksView, TaskDetailView, TasksView

app_name = "tasks"

urlpatterns = [
    path(
        "tasks/",
        AllTasksView.as_view(),
        name="tasks",
    ),
    path(
        "<uuid:project_id>/tasks/",
        TasksView.as_view(),
        name="tasks",
    ),
    path(
        "<uuid:project_id>/tasks/<uuid:task_id>/",
        TaskDetailView.as_view(),
        name="task-detail",
    )
]