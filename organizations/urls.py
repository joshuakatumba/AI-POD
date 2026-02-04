from django.urls import path
from .views import OrganizationCreateView, OrganizationMembersView

app_name = "organizations"

urlpatterns = [
    path(
        "create/",
        OrganizationCreateView.as_view(),
        name="create"
    ),
    path(
        "<uuid:organization_id>/members/",
        OrganizationMembersView.as_view(),
        name="organization-members",
    ),
]
