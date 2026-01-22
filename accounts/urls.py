from django.urls import path
from .views import SignUpView, LoginView, SwitchTenantView

urlpatterns = [
    path("signup/", SignUpView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
    path("tenant/switch/", SwitchTenantView.as_view(), name="switch-tenant"),
]