from django.urls import path
from tasks.views import TaskAttachmentDetailView, TaskAttachmentsView

app_name = "task_attachments"

urlpatterns = [
    path("<uuid:task_id>/attachments/", TaskAttachmentsView.as_view(), name="task_attachments"),
    path(
        "<uuid:task_id>/attachments/<uuid:attachment_id>/",
        TaskAttachmentDetailView.as_view(),
        name="task_attachment_detail",
    ),
]