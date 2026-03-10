from django.urls import path
from sysadmin.views import AdminOrganisationListView, AdminForceDeleteOrganisationView, SysAdminUsersView, SysAdminUsersDetailsView

app_name = "sysadmin"

urlpatterns = [
    path(
        "organizations/",
        AdminOrganisationListView.as_view(),
        name="organizations",
    ),
    path(
        "admin/<uuid:organization_id>/",
        AdminForceDeleteOrganisationView.as_view(),
        name="admin-organisation",
    ),
    path("users/", SysAdminUsersView.as_view(), name="users"),
    path("users/<uuid:user_id>/", SysAdminUsersDetailsView.as_view(), name="users-details"),
]