from django.urls import path
from projectMembers.views import ProjectMembersApiView, ProjectMemberDetailApiView

app_name = "projectMembers"

urlpatterns = [
    path(
        "<uuid:project_id>/members/",
        ProjectMembersApiView.as_view(),
        name="project-members",
    ),
    path(
        "<uuid:project_id>/members/<uuid:member_id>/",
        ProjectMemberDetailApiView.as_view(),
        name="project-member-detail",
    ),
]