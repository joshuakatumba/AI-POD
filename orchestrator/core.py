from dataclasses import dataclass, field
from pydantic import Field
from enum import Enum
import os
from asgiref.sync import sync_to_async
from django.db import transaction
from typing import AsyncGenerator, Dict, Any, List, Literal
from pydantic import BaseModel
from chat.models import Session
from orchestrator.utils import broadcast_session_event
from projects.models import Report, ReportTask
from pydantic_ai import Agent, RunContext
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider


class SessionPhase(str, Enum):
    INTRO = "intro"
    TASK_DISCOVERY = "task_discovery"
    TASK_INTERVIEW = "task_interview"
    REVIEW = "review"
    REPORT = "report"
    COMPLETE = "complete"


class TaskStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"


class TaskSnapshot(BaseModel):
    reference: str
    status: TaskStatus
    summary: str | None = None
    blockers: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)


class StructuredSnapshot(BaseModel):
    tasks: list[TaskSnapshot]
    completed: list[str] = Field(default_factory=list)
    in_progress: list[str] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    next_steps: list[str] = Field(default_factory=list)


class ReportInput(BaseModel):
    generated_text: str
    structured_data_snapshot: StructuredSnapshot


@dataclass
class EngineeringDeps:
    session: Any  # Session object
    user: Any     # Django User
    metadata: dict = field(default_factory=dict)
    task_snapshots: dict = field(default_factory=dict)
    current_task_reference: str | None = None
    phase: SessionPhase = SessionPhase.INTRO
    completed_tasks: set = field(default_factory=set)


class ReportAgentRunner:
    def __init__(self, workflow):
        provider = OpenAIProvider(
            api_key=workflow.ai_model.api_key
        )

        model = OpenAIChatModel(
            model_name=workflow.ai_model.name,
            provider=provider,
        )

        report_agent = Agent(
            model,
            deps_type=EngineeringDeps,
            system_prompt=workflow.system_prompt,
        )

        self.agent = report_agent

        def get_next_task(ctx: RunContext[EngineeringDeps]) -> ReportTask | None:
            tasks = ReportTask.objects.filter(
                session=ctx.deps.session
            ).select_related("task")

            for t in tasks:
                if t.task.reference not in ctx.deps.completed_tasks:
                    return t

            return None

        def is_task_complete(snapshot: dict) -> bool:
            return (
                snapshot.get("status") is not None
                and snapshot.get("summary") is not None
                and isinstance(snapshot.get("blockers"), list)
                and isinstance(snapshot.get("next_steps"), list)
            )

        @report_agent.tool
        async def get_session_tasks(ctx: RunContext[EngineeringDeps]) -> str:
            """
            Returns all session tasks with true execution status.
            """

            session_tasks = ReportTask.objects.filter(
                session=ctx.deps.session
            ).select_related("task").all()

            lines = []

            async for report_task in session_tasks:
                snapshot = ctx.deps.task_snapshots.get(report_task.task.reference, {})
                status = snapshot.get("status", "not_started")
                lines.append(
                    f"- {report_task.task.name} ({report_task.task.reference}) | status: {status}"
                )

            return "Current Task Status:\n" + "\n".join(lines)



        @report_agent.tool
        async def update_task_snapshot(
            ctx: RunContext[EngineeringDeps],
            snapshot: TaskSnapshot,
        ) -> str:
            """
            Updates the runtime structured state for a task
            based on conversational progress updates.
            """

            task_exists = await ReportTask.objects.filter(
                session=ctx.deps.session,
                task__reference=snapshot.reference,
            ).aexists()

            if not task_exists:
                return (
                    f"❌ Task '{snapshot.reference}' "
                    f"is not part of this session."
                )

            ctx.deps.task_snapshots[snapshot.reference] = {
                "status": snapshot.status.value,
                "summary": snapshot.summary,
                "blockers": snapshot.blockers,
                "next_steps": snapshot.next_steps,
            }

            if is_task_complete(ctx.deps.task_snapshots[snapshot.reference]):
                ctx.deps.completed_tasks.add(snapshot.reference)

            return (
                f"✅ Snapshot updated for "
                f"{snapshot.reference}"
            )
        
        @report_agent.tool
        async def create_report(
            ctx: RunContext[EngineeringDeps],
            report: ReportInput,
        ) -> str:
            """
            Creates and saves a report for the current session.

            The final report contains:
            - Human-readable markdown report
            - Immutable structured snapshot of task execution state
            """

            session = ctx.deps.session

            # Safe because these should already be preloaded
            membership = session.membership
            organisation = session.organisation
            project = session.project

            generated_text = report.generated_text

            session_tasks = (
                ReportTask.objects.filter(
                    session=session,
                )
                .select_related("task").all()
            )

            structured_tasks = []

            completed = []
            in_progress = []
            blockers = []
            next_steps = []

            async for report_task in session_tasks:

                snapshot = ctx.deps.task_snapshots.get(
                    report_task.task.reference,
                    {
                        "status": TaskStatus.NOT_STARTED.value,
                        "summary": None,
                        "blockers": [],
                        "next_steps": [],
                    },
                )

                task_payload = {
                    "reference": report_task.task.reference,
                    "name": report_task.task.name,
                    "status": snapshot["status"],
                    "summary": snapshot["summary"],
                    "blockers": snapshot["blockers"],
                    "next_steps": snapshot["next_steps"],
                }

                structured_tasks.append(task_payload)

                # Aggregate summary sections
                if snapshot["status"] == TaskStatus.COMPLETED.value:
                    completed.append(report_task.task.name)

                elif snapshot["status"] == TaskStatus.IN_PROGRESS.value:
                    in_progress.append(report_task.task.name)

                blockers = list(set(blockers + snapshot["blockers"]))
                next_steps = list(set(next_steps + snapshot["next_steps"]))

            structured_data_snapshot = {
                "tasks": structured_tasks,
                "completed": completed,
                "in_progress": in_progress,
                "blockers": blockers,
                "next_steps": next_steps,
            }

            report_instance, created = await Report.objects.aupdate_or_create(
                session=session,
                defaults={
                    "project_id": session.project_id,
                    "membership_id": session.membership_id,
                    "organisation_id": session.organisation_id,
                    "generated_text": generated_text,
                    "structured_data_snapshot": structured_data_snapshot,
                    "status": "draft",
                    "created_by": session.created_by,
                }
            )

            async for report_task in session_tasks:
                if report_task.report_id != report_instance.id:
                    report_task.report = report_instance
                    await report_task.asave(update_fields=["report"])        

            return (
                f"✅ Report created successfully.\n"
                f"Status: DRAFT\n"
                f"Reference: {report_instance.reference}\n"
                f"Project: {project.name}\n"
                f"Session: {session.title}"
            )


        @report_agent.tool
        async def update_report(
            ctx: RunContext[EngineeringDeps],
            report: ReportInput,
        ) -> str:
            """
            Updates an existing draft report for the current session.

            Rules:
            - Only draft reports can be updated
            - Completed reports are immutable
            - This tool is used during the REVIEW phase of the session
            """

            session = ctx.deps.session

            # Fetch existing report for session
            try:
                existing_report = await Report.objects.aget(session=session)
            except Report.DoesNotExist:
                return "❌ No report exists for this session yet."

            # Guard: prevent updates to finalized reports
            if existing_report.status == "complete":
                return (
                    "❌ This report is finalized and cannot be modified.\n"
                    "Create a new session if changes are needed."
                )

            # Update allowed fields
            existing_report.generated_text = report.generated_text
            existing_report.structured_data_snapshot = report.structured_data_snapshot

            await existing_report.asave(
                update_fields=[
                    "generated_text",
                    "structured_data_snapshot",
                ]
            )

            return (
                f"✅ Draft report updated successfully.\n"
                f"Status: DRAFT\n"
                f"Session: {session.title}\n"
                f"Status: {existing_report.status}"
            )
        

        @report_agent.tool
        async def complete_task_interview(
            ctx: RunContext[EngineeringDeps],
            task_reference: str,
        ) -> str:
            """
            Marks a task as fully interviewed and moves the agent forward.
            """

            ctx.deps.completed_tasks.add(task_reference)
            ctx.deps.current_task_reference = None

            return f"✅ Task {task_reference} marked as complete."
        

        @report_agent.tool
        async def finalize_report(
            ctx: RunContext[EngineeringDeps],
        ) -> str:
            def _finalize():
                with transaction.atomic():
                    report = (
                        Report.objects
                        .select_for_update()
                        .get(session=ctx.deps.session)
                    )

                    if report.status == "complete":
                        return None

                    report.status = "complete"
                    report.save(update_fields=["status"])

                    return report

            report = await sync_to_async(_finalize)()

            if report is None:
                return "⚠️ Report is already finalized."

            FRONTEND_URL = os.getenv("FRONTEND_BASE_URL", "").rstrip("/")
            report_url = f"{FRONTEND_URL}/reports/{report.id}"

            return (
                "✅ Report has been finalized and locked.\n"
                f"View completed Report: {report_url}\n"
                f"Reference: {report.reference}"
            )
        

class TranslationItem(BaseModel):
    field_name: str
    source_language: str
    target_language: str
    original_text: str
    intended_text: str
    translated_text: str


class TranslationAgentRunner:
    def __init__(self, workflow):
        provider = OpenAIProvider(
            api_key=workflow.ai_model.api_key
        )

        model = OpenAIChatModel(
            model_name=workflow.ai_model.name,
            provider=provider,
        )

        translation_agent = Agent(  
            model,
            output_type=List[TranslationItem],
            system_prompt=workflow.system_prompt,
        )

        self.agent = translation_agent