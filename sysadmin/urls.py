from django.urls import path
from sysadmin.views import AdminOrganisationListView, AdminForceDeleteOrganisationView, SysAdminUsersView


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
]