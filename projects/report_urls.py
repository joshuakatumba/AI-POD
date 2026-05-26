from django.urls import path
from projects.views import ReportCommentsView, ReportDetailApiView, ReportInvalidateApiView, ReportsApiView

app_name = "reports"

urlpatterns = [
    path(
        "",
        ReportsApiView.as_view(),
        name="reports",
    ),
    path(
        "<uuid:report_id>/",
        ReportDetailApiView.as_view(),
        name="report_detail",
    ),
    path(
        "<uuid:report_id>/invalidate/",
        ReportInvalidateApiView.as_view(),
        name="report_invalidate",
    ),
    path(
        "<uuid:report_id>/comments/",
        ReportCommentsView.as_view(),
        name="report_comments",
    ),
]