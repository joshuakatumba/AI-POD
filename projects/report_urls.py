from django.urls import path
from projects.views import ReportCommentDetailView, ReportCommentsView, ReportDetailApiView, ReportInvalidateApiView, ReportsApiView

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
    path(
        "<uuid:report_id>/comments/<uuid:comment_id>/",
        ReportCommentDetailView.as_view(),
        name="report_comment_detail",
    ),
]
