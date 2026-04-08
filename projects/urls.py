from django.urls import path
from projects.views import ProjectDetailApiView, ProjectsApiView, ReportDetailApiView, ReportsApiView

app_name = "projects"

urlpatterns = [
    path(
        "",
        ProjectsApiView.as_view(),
        name="projects",
    ),
    path(
        "<uuid:project_id>/",
        ProjectDetailApiView.as_view(),
        name="project",
    ),
    path(
        "reports/",
        ReportsApiView.as_view(),
        name="reports",
    ),
    path(
        "<uuid:project_id>/reports/<uuid:report_id>/",
        ReportDetailApiView.as_view(),
        name="project_report_detail",
    ),
]
