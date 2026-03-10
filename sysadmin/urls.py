from django.urls import path
from sysadmin.views import AdminOrganisationListView, AdminForceDeleteOrganisationView
from sysadmin.views import AdminOrganisationListView

app_name = "sysadmin"

urlpatterns = [
    path(
        "organizations/",
        AdminOrganisationListView.as_view(),
        name="organizations",
    ),
    # Admin force delete organisation (DELETE to /organizations/admin/<uuid:organization_id>/)
    path(
        "admin/<uuid:organization_id>/",
        AdminForceDeleteOrganisationView.as_view(),
        name="admin-organisation",
    ),
]