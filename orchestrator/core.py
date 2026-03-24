from dataclasses import dataclass, field
from typing import AsyncGenerator, Dict, Any
from chat.models import Session
from orchestrator.utils import broadcast_session_event
from projects.models import ReportTask
from pydantic_ai import Agent, RunContext
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider


@dataclass
class EngineeringDeps:
    session: Any  # Session object
    user: Any     # Django User
    metadata: dict = field(default_factory=dict)

    
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

        @report_agent.tool
        async def get_session_tasks(ctx: RunContext[EngineeringDeps]) -> str:
            """Returns a list of all tasks in this session and their validation status."""
            tasks = ReportTask.objects.filter(session=ctx.deps.session).select_related('task')
            
            status_list = []
            async for rt in tasks:
                status = "✅ Validated" if rt.is_validated_by_ai else "❌ Pending"
                status_list.append(f"- {rt.task.name} ({rt.task.reference}): {status}")
            
            return "Current Task Status:\n" + "\n".join(status_list)
        
        @report_agent.tool
        async def validate_task(ctx: RunContext[EngineeringDeps], task_ref: str, technical_notes: str) -> str:
            """
            Records technical data for a specific task.
            task_ref: The reference ID (e.g., TSK-101).
            technical_notes: The data provided by the engineer.
            """
            try:
                rt = await ReportTask.objects.aget(
                    session=ctx.deps.session, 
                    task__reference=task_ref
                )
                rt.is_validated_by_ai = True
                rt.ai_notes = technical_notes
                await rt.asave()

                # SINGLE PIPE: Update the MUI Sidebar
                await broadcast_session_event(
                    ctx.deps.session.id, 
                    "task_validated", 
                    {"task_id": str(rt.task_id), "ref": task_ref}
                )

                return f"Task {task_ref} has been successfully validated."
            except ReportTask.DoesNotExist:
                return f"Error: Task {task_ref} is not associated with this session."

        @report_agent.tool
        async def transition_to_drafting(ctx: RunContext[EngineeringDeps]) -> str:
            """
            Call this to finalize the interview and open the Report Draft view.
            Only call this when the user is satisfied and tasks are validated.
            """
            session = ctx.deps.session
            
            # Logic Guard: Check for any unvalidated tasks
            pending_exists = await ReportTask.objects.filter(
                session=session, 
                is_validated_by_ai=False
            ).aexists()

            if pending_exists:
                return "I cannot generate the report yet because some tasks are still pending validation."

            # Update Session State
            session.status = 'drafting'
            await session.asave()

            # SINGLE PIPE: Trigger the MUI Slide/Transition
            await broadcast_session_event(
                session.id, 
                "status_update", 
                {"new_status": "drafting"}
            )

            return "The session has been moved to drafting. The report interface is now opening."

        self.agent = report_agent



