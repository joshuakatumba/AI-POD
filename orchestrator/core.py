from dataclasses import dataclass, field
from enum import Enum
import os
from asgiref.sync import sync_to_async
from django.db import transaction
from typing import Any, List
from pydantic import BaseModel
from chat.models import Session
from orchestrator.utils import broadcast_session_event
from projects.models import Report, ReportTask
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider


class SessionPhase(str, Enum):
    INTRO = "intro"
    TASK_DISCOVERY = "task_discovery"
    TASK_INTERVIEW = "task_interview"
    REVIEW = "review"
    REPORT = "report"
    COMPLETE = "complete"


@dataclass
class EngineeringDeps:
    session: Any
    user: Any
    metadata: dict = field(default_factory=dict)
    task_snapshots: dict = field(default_factory=dict)
    current_task_reference: str | None = None
    phase: SessionPhase = SessionPhase.INTRO
    completed_tasks: set = field(default_factory=set)


class ReportAgentRunner:
    def __init__(self, workflow):
        provider = GoogleProvider(
            api_key=workflow.ai_model.api_key
        )

        model = GoogleModel(
            workflow.ai_model.name,
            provider=provider,
        )

        report_agent = Agent(
            model,
            deps_type=EngineeringDeps,
            system_prompt=workflow.system_prompt,
        )

        self.agent = report_agent

        @report_agent.tool
        async def get_session_tasks(ctx: RunContext[EngineeringDeps]) -> str:
            """
            Returns the list of tasks for this session along with their current
            status if already recorded. Call this at the start of the interview.
            """
            try:
                session_id = ctx.deps.session.id
                session_tasks = await sync_to_async(list)(
                    ReportTask.objects.filter(
                        session_id=session_id
                    ).select_related("task").all()
                )
                if not session_tasks:
                    return "No tasks found for this session."

                lines = []
                for rt in session_tasks:
                    snap = ctx.deps.task_snapshots.get(rt.task.reference, {})
                    status = snap.get("status", "not_started")
                    lines.append(f"- {rt.task.name} ({rt.task.reference}) | status: {status}")
                return "Tasks for this session:\n" + "\n".join(lines)
            except Exception as e:
                return f"Error fetching tasks: {str(e)}"

        @report_agent.tool
        async def save_task_update(
            ctx: RunContext[EngineeringDeps],
            task_reference: str,
            status: str,
            summary: str,
            blockers: str = "",
            next_steps: str = "",
        ) -> str:
            """
            Saves the user's update for one task after you've asked them what they
            did, the status, blockers, and next steps. Call this once per task
            after you have enough information. status must be one of:
            not_started, in_progress, blocked, completed.
            blockers and next_steps are plain text (use 'none' if not applicable).
            """
            task_exists = await ReportTask.objects.filter(
                session_id=ctx.deps.session.id,
                task__reference=task_reference,
            ).aexists()

            if not task_exists:
                return f"Task '{task_reference}' is not part of this session."

            ctx.deps.task_snapshots[task_reference] = {
                "status": status,
                "summary": summary,
                "blockers": [b.strip() for b in blockers.split(",") if b.strip() and b.strip().lower() != "none"],
                "next_steps": [n.strip() for n in next_steps.split(",") if n.strip() and n.strip().lower() != "none"],
            }
            ctx.deps.completed_tasks.add(task_reference)

            return f"Saved update for {task_reference}."

        @report_agent.tool
        async def preview_report(
            ctx: RunContext[EngineeringDeps],
            report_text: str,
        ) -> str:
            """
            Generates a DRAFT preview of the report for the user to review.
            This does NOT submit or finalize anything. Call this after all
            tasks have been interviewed, to show the user a summary. Always
            ask the user afterward if they want to add anything or if they
            are ready to submit.
            """
            session_id = ctx.deps.session.id
            session = await Session.objects.select_related(
                "project", "membership", "organisation", "created_by"
            ).aget(id=session_id)

            session_tasks = await sync_to_async(list)(
                ReportTask.objects.filter(session_id=session_id).select_related("task").all()
            )

            structured_tasks = []
            completed, in_progress, blockers, next_steps = [], [], [], []

            for rt in session_tasks:
                snap = ctx.deps.task_snapshots.get(
                    rt.task.reference,
                    {"status": "not_started", "summary": "", "blockers": [], "next_steps": []},
                )
                structured_tasks.append({
                    "reference": rt.task.reference,
                    "name": rt.task.name,
                    **snap,
                })
                if snap["status"] == "completed":
                    completed.append(rt.task.name)
                elif snap["status"] == "in_progress":
                    in_progress.append(rt.task.name)
                blockers = list(set(blockers + snap["blockers"]))
                next_steps = list(set(next_steps + snap["next_steps"]))

            structured_data_snapshot = {
                "tasks": structured_tasks,
                "completed": completed,
                "in_progress": in_progress,
                "blockers": blockers,
                "next_steps": next_steps,
            }

            report_instance, _ = await Report.objects.aupdate_or_create(
                session=session,
                defaults={
                    "project_id": session.project_id,
                    "membership_id": session.membership_id,
                    "organisation_id": session.organisation_id,
                    "generated_text": report_text,
                    "structured_data_snapshot": structured_data_snapshot,
                    "status": "draft",
                    "created_by": session.created_by,
                }
            )

            for rt in session_tasks:
                if rt.report_id != report_instance.id:
                    rt.report = report_instance
                    await sync_to_async(rt.save)(update_fields=["report"])

            return (
                "DRAFT REPORT PREVIEW (not submitted yet):\n\n"
                f"{report_text}\n\n"
                "Ask the user: does this look correct, anything to add, "
                "or are they ready to submit?"
            )

        @report_agent.tool
        async def submit_report(ctx: RunContext[EngineeringDeps]) -> str:
            """
            Finalizes and locks the report. ONLY call this when the user has
            explicitly confirmed they want to submit (e.g. they say 'submit',
            'yes finalize it', 'looks good, send it'). Never call this on
            your own initiative.
            """
            session_id = ctx.deps.session.id

            def _finalize():
                with transaction.atomic():
                    report = Report.objects.select_for_update().get(session_id=session_id)
                    if report.status == "complete":
                        return None
                    report.status = "complete"
                    report.save(update_fields=["status"])
                    return report

            report = await sync_to_async(_finalize)()

            if report is None:
                return "This report has already been submitted."

            from projects.helpers import queue_report_translation
            await sync_to_async(queue_report_translation, thread_sensitive=True)(report)

            FRONTEND_URL = os.getenv("FRONTEND_BASE_URL", "").rstrip("/")
            report_url = f"{FRONTEND_URL}/reports/{report.id}"

            return (
                "Report submitted and finalized successfully.\n"
                f"View it here: {report_url}\n"
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
        provider = GoogleProvider(api_key=workflow.ai_model.api_key)
        model = GoogleModel(workflow.ai_model.name, provider=provider)
        translation_agent = Agent(
            model,
            output_type=List[TranslationItem],
            system_prompt=workflow.system_prompt,
        )
        self.agent = translation_agent