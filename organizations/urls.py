from django.urls import path
from organizations.views import (
    OrganizationCreateView,
    OrganizationMembersView,
    OrganizationMemberView,
)

app_name = "organizations"

urlpatterns = [
    path(
        "create/",
        OrganizationCreateView.as_view(),
        name="create",
    ),
    path(
        "<uuid:organization_id>/members/",
        OrganizationMembersView.as_view(),
        name="members",
    ),
    path(
        "<uuid:organization_id>/members/<uuid:membership_id>/",
        OrganizationMemberView.as_view(),
        name="member",
    ),
]
