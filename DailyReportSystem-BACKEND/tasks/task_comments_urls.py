from django.urls import path
from tasks.views import TaskCommentDetailView, TaskCommentsView

app_name = "task_comments"

urlpatterns = [
    path("<uuid:task_id>/comments/", TaskCommentsView.as_view(), name="task_comments"),
    path("<uuid:task_id>/comments/<uuid:comment_id>/", TaskCommentDetailView.as_view(), name="task_comment_detail"),
]