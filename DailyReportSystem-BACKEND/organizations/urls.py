from django.urls import path
from organizations.views import (
    OrganisationsView,
    OrganisationView,
    OrganizationMembersView,
    OrganizationMemberView,
)

app_name = "organizations"

urlpatterns = [
    # Create organisation (POST to /organizations/)
    path(
        "",
        OrganisationsView.as_view(),
        name="organisations",
    ),
    # Delete organisation (DELETE to /organizations/<uuid:organization_id>/)
    path(
        '<uuid:organization_id>/',
        OrganisationView.as_view(),
        name='organisation'
    ),
    # Organisation members collection
    path(
        "<uuid:organization_id>/members/",
        OrganizationMembersView.as_view(),
        name="members",
    ),
    # Single organisation member
    path(
        "<uuid:organization_id>/members/<uuid:membership_id>/",
        OrganizationMemberView.as_view(),
        name="member",
    ),
]
