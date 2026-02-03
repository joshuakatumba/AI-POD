from django.urls import path
from .views import OrganizationCreateView

app_name = "organisations"

urlpatterns = [
    path(
        "create/",
        OrganizationCreateView.as_view(),
        name="create",
    ),
]
