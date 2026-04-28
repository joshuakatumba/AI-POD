from django.urls import path

from chat.views import SessionApiView, SessionsApiView, StreamApiView
from chat.views import ChatAIWorkflowsApiView, ChatAIWorkflowApiView
# from chat.views import ChatStreamApiView

app_name = "chat"

urlpatterns = [
    path(
        "",
        SessionsApiView.as_view(),
        name="sessions",
    ),
    path(
        "<uuid:session_id>/",
        SessionApiView.as_view(),
        name="session",
    ),
    path(
        "<uuid:session_id>/stream/",
        StreamApiView.as_view(),
        name="stream",
    ),
    path(
        "ai-workflows/",
        ChatAIWorkflowsApiView.as_view(),
        name="workflows",
    ),    
    path(
        "ai-workflows/<uuid:workflow_id>/",
        ChatAIWorkflowApiView.as_view(),
        name="workflow",
    ),
]
