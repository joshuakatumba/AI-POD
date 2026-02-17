from django.urls import path
from projects.views import ProjectsApiView

app_name = "projects"

urlpatterns = [
    path(
        "",
        ProjectsApiView.as_view(),
        name="projects",
    ),
]
