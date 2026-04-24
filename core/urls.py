"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path, include
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from core.views import healthz
from sysadmin.views import AIWorkflowApiView, AIWorkflowsApiView

# Swagger Schema View Configuration
schema_view = get_schema_view(
   openapi.Info(
      title="Daily Report System - API",
      default_version='v1',
      description="API documentation for Daily Report System",
   ),
   public=True,
   permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path("healthz/", healthz),
    path("api/auth/", include("accounts.urls")),
    path("api/organisations/", include("organizations.urls")),
    path("api/projects/", include("projects.urls")),
    path("api/projects/", include("projectMembers.urls")),
    path("api/projects/", include("tasks.urls")),
    path("api/tasks/", include("tasks.task_comments_urls")),
    path("api/workflows/", AIWorkflowsApiView.as_view(), name="public-workflows"),
    path("api/workflows/<uuid:workflow_id>/", AIWorkflowApiView.as_view(), name="public-workflow"),
    path("api/sysadmin/", include("sysadmin.urls")),
    path("api/chat/", include("chat.urls")),
    # Swagger UI
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('api/docs/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('api/redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
]
