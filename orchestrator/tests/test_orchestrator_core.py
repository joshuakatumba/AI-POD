from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from django.test import TestCase

from organizations.models import Membership, Organization
from projectMembers.models import ProjectMember
from projects.models import Project, ReportTask
from sysadmin.models import AIModel, AIWorkflow
from tasks.models import Task

from orchestrator.core import EngineeringDeps, ReportAgentRunner

User = get_user_model()


class FakeAgent:
    def __init__(self, model, deps_type=None, system_prompt=None):
        self.model = model
        self.deps_type = deps_type
        self.system_prompt = system_prompt
        self.registered_tools = {}

    def tool(self, fn):
        self.registered_tools[fn.__name__] = fn
        return fn


class OrchestratorCoreTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="orchestrator@test.com", password="pass")
        self.org = Organization.objects.create(name="Orchestrator Org", created_by=self.user)
        self.membership = Membership.objects.create(
            user=self.user,
            organization=self.org,
            role="admin",
            created_by=self.user,
        )
        self.project = Project.objects.create(
            name="Project Beta",
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
            name="Validate concrete",
            description="",
            expected_hours=Decimal("2.0"),
            organisation=self.org,
            project=self.project,
            reported_by=self.project_member,
            assigned_to=self.project_member,
            created_by=self.user,
        )
        self.ai_model = AIModel.objects.create(
            name="gpt-4o-mini",
            provider="openai",
            api_key="fake-key",
            created_by=self.user,
        )
        self.workflow = AIWorkflow.objects.create(
            name="Report Workflow Core",
            category="report",
            system_prompt="Collect task notes.",
            ai_model=self.ai_model,
            created_by=self.user,
        )

        from chat.models import Session

        self.session = Session.objects.create(
            created_by=self.user,
            organisation=self.org,
            membership=self.membership,
            project=self.project,
            workflow=self.workflow,
            session_type="report_generation",
            status="interviewing",
            title="Inspection: Project Beta",
        )
        self.report_task = ReportTask.objects.create(
            session=self.session,
            task=self.task,
            organisation=self.org,
            created_by=self.user,
        )

    def _build_runner(self):
        with patch("orchestrator.core.OpenAIProvider") as mock_provider:
            with patch("orchestrator.core.OpenAIChatModel") as mock_model:
                with patch("orchestrator.core.Agent", FakeAgent):
                    runner = ReportAgentRunner(self.workflow)
        return runner, mock_provider, mock_model

    def test_runner_wires_provider_model_and_prompt(self):
        runner, mock_provider, mock_model = self._build_runner()

        mock_provider.assert_called_once_with(api_key=self.workflow.ai_model.api_key)
        mock_model.assert_called_once()
        self.assertEqual(runner.agent.system_prompt, self.workflow.system_prompt)
        self.assertEqual(runner.agent.deps_type, EngineeringDeps)

    def test_validate_task_success_updates_task_and_broadcasts(self):
        runner, _, _ = self._build_runner()
        validate_tool = runner.agent.registered_tools["validate_task"]

        ctx = SimpleNamespace(deps=SimpleNamespace(session=self.session))

        with patch("orchestrator.core.broadcast_session_event", new_callable=AsyncMock) as mock_broadcast:
            result = async_to_sync(validate_tool)(ctx, self.task.reference, "All checks passed")

        self.report_task.refresh_from_db()
        self.assertTrue(self.report_task.is_validated_by_ai)
        self.assertEqual(self.report_task.ai_notes, "All checks passed")
        self.assertIn("successfully validated", result)
        mock_broadcast.assert_awaited_once()

    def test_validate_task_missing_returns_error_and_no_broadcast(self):
        runner, _, _ = self._build_runner()
        validate_tool = runner.agent.registered_tools["validate_task"]

        ctx = SimpleNamespace(deps=SimpleNamespace(session=self.session))

        with patch("orchestrator.core.broadcast_session_event", new_callable=AsyncMock) as mock_broadcast:
            result = async_to_sync(validate_tool)(ctx, "TSK-DOES-NOT-EXIST", "notes")

        self.assertIn("not associated", result)
        mock_broadcast.assert_not_awaited()

    def test_transition_to_drafting_blocks_then_succeeds(self):
        runner, _, _ = self._build_runner()
        transition_tool = runner.agent.registered_tools["transition_to_drafting"]
        ctx = SimpleNamespace(deps=SimpleNamespace(session=self.session))

        with patch("orchestrator.core.broadcast_session_event", new_callable=AsyncMock) as mock_broadcast:
            blocked = async_to_sync(transition_tool)(ctx)

        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "interviewing")
        self.assertIn("cannot generate", blocked)
        mock_broadcast.assert_not_awaited()

        self.report_task.is_validated_by_ai = True
        self.report_task.save(update_fields=["is_validated_by_ai"])

        with patch("orchestrator.core.broadcast_session_event", new_callable=AsyncMock) as mock_broadcast:
            success = async_to_sync(transition_tool)(ctx)

        self.session.refresh_from_db()
        self.assertEqual(self.session.status, "drafting")
        self.assertIn("moved to drafting", success)
        mock_broadcast.assert_awaited_once()
