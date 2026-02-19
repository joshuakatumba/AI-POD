from django.urls import path
from projectMembers.views import ProjectMembersApiView

app_name = "projectMembers"

urlpatterns = [
    path(
        "<uuid:project_id>/members/",
        ProjectMembersApiView.as_view(),
        name="project-members",
    ),
]