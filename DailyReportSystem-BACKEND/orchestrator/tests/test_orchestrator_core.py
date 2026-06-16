from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from django.test import TestCase

from organizations.models import Membership, Organization
from projectMembers.models import ProjectMember
from projects.models import Project, ReportTask, Report
from sysadmin.models import AIModel, AIWorkflow
from tasks.models import Task

from orchestrator.core import (
    EngineeringDeps,
    ReportAgentRunner,
    TaskSnapshot,
    TaskStatus,
)

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
        self.user = User.objects.create_user(
            email="orchestrator@test.com",
            password="pass"
        )

        self.org = Organization.objects.create(
            name="Orchestrator Org",
            created_by=self.user
        )

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

    # -----------------------------
    # CORE INIT TEST
    # -----------------------------

    def test_runner_wires_provider_model_and_prompt(self):
        runner, mock_provider, mock_model = self._build_runner()

        mock_provider.assert_called_once_with(
            api_key=self.workflow.ai_model.api_key
        )
        mock_model.assert_called_once()

        self.assertEqual(runner.agent.system_prompt, self.workflow.system_prompt)
        self.assertEqual(runner.agent.deps_type, EngineeringDeps)

    # -----------------------------
    # TASK SNAPSHOT TESTS
    # -----------------------------

    def _ctx(self):
        return SimpleNamespace(
            deps=EngineeringDeps(
                session=self.session,
                user=self.user,
                task_snapshots={},
                completed_tasks=set(),
            )
        )

    def test_update_task_snapshot_success(self):
        runner, _, _ = self._build_runner()
        tool = runner.agent.registered_tools["update_task_snapshot"]

        ctx = self._ctx()

        snapshot = TaskSnapshot(
            reference=self.task.reference,
            status=TaskStatus.COMPLETED,
            summary="Validated successfully",
            blockers=[],
            next_steps=["Archive results"],
        )

        result = async_to_sync(tool)(ctx, snapshot)

        self.assertIn("Snapshot updated", result)
        self.assertEqual(
            ctx.deps.task_snapshots[self.task.reference]["summary"],
            "Validated successfully",
        )

    def test_update_task_snapshot_invalid_task(self):
        runner, _, _ = self._build_runner()
        tool = runner.agent.registered_tools["update_task_snapshot"]

        ctx = self._ctx()

        snapshot = TaskSnapshot(
            reference="INVALID",
            status=TaskStatus.COMPLETED,
            summary="n/a",
            blockers=[],
            next_steps=[],
        )

        result = async_to_sync(tool)(ctx, snapshot)

        self.assertIn("not part of this session", result)

    # -----------------------------
    # REPORT CREATION
    # -----------------------------
    @patch("projects.helpers.queue_report_translation")
    def test_create_report_success(self, mock_queue):
        runner, _, _ = self._build_runner()
        tool = runner.agent.registered_tools["create_report"]

        ctx = self._ctx()

        report_input = SimpleNamespace(
            generated_text="Final report content",
            structured_data_snapshot={
                "tasks": [],
                "completed": [],
                "in_progress": [],
                "blockers": [],
                "next_steps": [],
            },
        )

        result = async_to_sync(tool)(ctx, report_input)

        self.assertIn("Report created successfully", result)

        report = Report.objects.get(session=self.session)
        self.assertEqual(report.generated_text, "Final report content")

    # -----------------------------
    # FINALIZE REPORT
    # -----------------------------

    @patch("projects.helpers.queue_report_translation")
    def test_finalize_report_success(self, mock_queue):
        runner, _, _ = self._build_runner()
        tool = runner.agent.registered_tools["finalize_report"]

        Report.objects.create(
            session=self.session,
            status="draft",
            generated_text="x",
            structured_data_snapshot={},
            project_id=self.project.id,
            membership_id=self.membership.id,
            organisation_id=self.org.id,
            created_by=self.user,
        )

        ctx = self._ctx()

        with patch.dict("os.environ", {"FRONTEND_BASE_URL": "http://test"}):
            result = async_to_sync(tool)(ctx)

        self.assertIn("Report has been finalized", result)

        report = Report.objects.get(session=self.session)
        self.assertEqual(report.status, "complete")

    @patch("projects.helpers.queue_report_translation")
    def test_finalize_report_already_complete(self, mock_queue):
        runner, _, _ = self._build_runner()
        tool = runner.agent.registered_tools["finalize_report"]

        Report.objects.create(
            session=self.session,
            status="complete",
            generated_text="x",
            structured_data_snapshot={},
            project_id=self.project.id,
            membership_id=self.membership.id,
            organisation_id=self.org.id,
            created_by=self.user,
        )

        ctx = self._ctx()

        result = async_to_sync(tool)(ctx)

        self.assertIn("already finalized", result)