from django.urls import path
from tasks.views import TasksView

app_name = "tasks"

urlpatterns = [
    path(
        "<uuid:project_id>/tasks/",
        TasksView.as_view(),
        name="tasks",
    ),
]
