from django.urls import path

from notifications.views import SendTestEmailView

app_name = "notifications"

urlpatterns = [
    path("test-email/", SendTestEmailView.as_view(), name="test-email"),
]
