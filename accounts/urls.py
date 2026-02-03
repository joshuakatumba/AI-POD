from django.urls import path
from .views import CurrentUserView, LogoutView, SignUpView, LoginView, SwitchOrganizationView

urlpatterns = [
    path("signup/", SignUpView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("current-user-info/", CurrentUserView.as_view(), name="current-user"),
    path("organization/switch/", SwitchOrganizationView.as_view(), name="switch-organization"),
]