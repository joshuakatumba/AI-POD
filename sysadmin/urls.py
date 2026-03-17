from django.urls import path
from sysadmin.views import AIModelApiView, AIModelsApiView, AIWorkflowApiView, AIWorkflowsApiView, AdminOrganisationListView, AdminForceDeleteOrganisationView, SysAdminUsersView, SysAdminUsersDetailsView

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
    path("ai-models/", AIModelsApiView.as_view(), name="ai-models"),
    path("ai-models/<uuid:model_id>/", AIModelApiView.as_view(), name="ai-model-detail"),
    path("ai-workflows", AIWorkflowsApiView.as_view(), name="ai-workflows"),
    path("ai-workflows/<uuid:workflow_id>", AIWorkflowApiView.as_view(), name="ai-workflow"),
]