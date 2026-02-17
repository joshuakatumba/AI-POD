from django.urls import path
from projects.views import ProjectDetailApiView, ProjectsApiView

app_name = "projects"

urlpatterns = [
    path(
        "",
        ProjectsApiView.as_view(),
        name="projects",
    ),
    path(
        "<uuid:project_id>/",
        ProjectDetailApiView.as_view(),
        name="project",
    ),
]
