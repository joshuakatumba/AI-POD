from django.urls import path
from .views import CurrentUserView, LogoutView, SignUpView, LoginView, SwitchOrganizationView, PasswordResetRequestView, PasswordResetConfirmView, ChangePasswordView, UpdateNotificationPreferenceView

urlpatterns = [
    path("signup/", SignUpView.as_view(), name="signup"),
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("current-user-info/", CurrentUserView.as_view(), name="current-user"),
    path("notification-preferences/", UpdateNotificationPreferenceView.as_view(), name="notification-preferences"),
    path("organization/switch/", SwitchOrganizationView.as_view(), name="switch-organization"),
]