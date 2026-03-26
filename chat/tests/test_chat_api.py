import json
from dataclasses import dataclass
from decimal import Decimal
from unittest.mock import patch

from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from chat.models import Session, SessionMessage
from core.tests.utils import MockAuthMixin
from organizations.models import Membership, Organization
from projectMembers.models import ProjectMember
from projects.models import Project, ReportTask
from sysadmin.models import AIModel, AIWorkflow
from tasks.models import Task

User = get_user_model()


@dataclass
class FakeUsage:
    requests: int
    request_tokens: int
    response_tokens: int
    total_tokens: int


class ChatApiTests(MockAuthMixin, APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="chat-user@test.com", password="pass")
        self.org = Organization.objects.create(name="Chat Org", created_by=self.user)
        self.membership = Membership.objects.create(
            user=self.user,
            organization=self.org,
            role="admin",
            created_by=self.user,
        )
        self.project = Project.objects.create(
            name="Project Alpha",
            organization=self.org,
            owner=self.membership,
            created_by=self.user,
        )
        self.project_member = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.membership,
            role="admin",
            created_by=self.user,
        )
        self.task = Task.objects.create(
            name="Inspect foundation",
            description="",
            expected_hours=Decimal("3.0"),
            organisation=self.org,
            project=self.project,
            reported_by=self.project_member,
            assigned_to=self.project_member,
            created_by=self.user,
        )
        self.ai_model = AIModel.objects.create(
            name="gpt-4o-mini",
            provider="openai",
            api_key="test-api-key",
            created_by=self.user,
        )
        self.workflow = AIWorkflow.objects.create(
            name="Report Workflow",
            category="report",
            system_prompt="You are helpful.",
            ai_model=self.ai_model,
            created_by=self.user,
        )

        self.sessions_url = "/api/chat/"

    def authenticate(self):
        self.client.force_authenticate(user=self.user)

    def _auth_payload(self):
        return {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.membership.id),
        }

    def test_create_session_success_seeds_messages_and_tasks(self):
        self.authenticate()

        payload = {
            "project_id": str(self.project.id),
            "workflow_id": str(self.workflow.id),
            "task_ids": [str(self.task.id)],
            "session_type": "report_generation",
        }

        with self.mock_auth(self._auth_payload()):
            response = self.client.post(self.sessions_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session = Session.objects.get(id=response.data["id"])

        self.assertEqual(session.project_id, self.project.id)
        self.assertEqual(session.workflow_id, self.workflow.id)
        self.assertEqual(session.membership_id, self.membership.id)
        self.assertEqual(session.organisation_id, self.org.id)
        self.assertEqual(ReportTask.objects.filter(session=session).count(), 1)
        self.assertEqual(SessionMessage.objects.filter(session=session).count(), 1)

    def test_create_session_rejects_missing_auth_context(self):
        self.authenticate()

        payload = {
            "project_id": str(self.project.id),
            "workflow_id": str(self.workflow.id),
            "task_ids": [str(self.task.id)],
        }

        with self.mock_auth({}):
            response = self.client.post(self.sessions_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("organisation", response.data)

    def test_stream_rejects_invalid_payload(self):
        self.authenticate()

        session = Session.objects.create(
            created_by=self.user,
            organisation=self.org,
            membership=self.membership,
            project=self.project,
            workflow=self.workflow,
            session_type="report_generation",
            status="ingesting",
            title="Inspection: Project Alpha",
        )

        stream_url = f"/api/chat/{session.id}/stream/"
        with self.mock_auth(self._auth_payload()):
            response = self.client.post(stream_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_stream_happy_path_emits_events_and_persists_assistant_message(self):
        self.authenticate()

        session = Session.objects.create(
            created_by=self.user,
            organisation=self.org,
            membership=self.membership,
            project=self.project,
            workflow=self.workflow,
            session_type="report_generation",
            status="ingesting",
            title="Inspection: Project Alpha",
        )
        SessionMessage.objects.create(
            session=session,
            organisation=self.org,
            membership=self.membership,
            created_by=self.user,
            role="assistant",
            content="Previous message",
        )

        class FakeRunResult:
            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def stream_text(self, debounce_by=None):
                for token in ["Hello", " world"]:
                    yield token

            async def get_output(self):
                return "Hello world"

            def usage(self):
                return FakeUsage(requests=1, request_tokens=3, response_tokens=2, total_tokens=5)

        class FakeAgent:
            def run_stream(self, user_text, deps=None, message_history=None):
                return FakeRunResult()

        class FakeRunner:
            def __init__(self, workflow):
                self.agent = FakeAgent()

        async def consume_async_stream(async_iterable):
            chunks = []
            async for chunk in async_iterable:
                chunks.append(chunk)
            return chunks

        stream_url = f"/api/chat/{session.id}/stream/"
        with patch("chat.views.ReportAgentRunner", FakeRunner):
            with self.mock_auth(self._auth_payload()):
                response = self.client.post(stream_url, {"text": "Hi"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        chunks = async_to_sync(consume_async_stream)(response.streaming_content)
        parsed = [json.loads(chunk.strip()) for chunk in chunks]

        self.assertEqual(parsed[0]["type"], "token")
        self.assertEqual(parsed[1]["type"], "token")
        self.assertEqual(parsed[-1]["type"], "final")
        self.assertEqual(parsed[-1]["data"], "Hello world")

        assistant_msg = SessionMessage.objects.filter(session=session, role="assistant").order_by("-created_at").first()
        self.assertIsNotNone(assistant_msg)
        self.assertEqual(assistant_msg.content, "Hello world")
        self.assertEqual(assistant_msg.metadata["usage"]["total_tokens"], 5)
