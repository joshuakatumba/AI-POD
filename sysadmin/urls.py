from django.urls import path
from sysadmin.views import AdminOrganisationListView

app_name = "sysadmin"

urlpatterns = [
    path(
        "organizations/",
        AdminOrganisationListView.as_view(),
        name="organizations",
    ),
]