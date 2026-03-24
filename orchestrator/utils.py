
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from chat.models import SessionMessage


def seed_session_ai(session):
    """
    Routes the seeding logic based on session_type.
    """
    seed_handlers = {
        'report_generation': _seed_report_generation,
    }

    # Get the specific seeder or fall back to a default
    handler = seed_handlers.get(session.session_type)
    return handler(session)

# --- Specific Handlers ---
def _seed_report_generation(session):
    task_count = session.session_tasks.count()
    
    # System Instruction
    SessionMessage.objects.create(
        session=session,
        organisation=session.organisation,
        membership=session.membership,
        created_by=session.created_by,
        role='system',
        content=(
            f"You are an AI specialized in report generation for {session.project.name}. "
            f"Tasks to cover: {task_count}."
        )
    )

    # First Greeting
    greeting = (
        f"Ready to begin the inspection for {session.project.name}. "
        f"I see we have {task_count} tasks to cover. Which one are we starting with?"
    )
    return SessionMessage.objects.create(session=session, organisation=session.organisation, membership=session.membership, role='assistant', content=greeting, created_by=session.created_by)


async def broadcast_session_event(session_id, event_type, data):
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"session_{session_id}",
        {
            "type": "broadcast_event",
            "payload": {
                "type": event_type,
                **data
            }
        }
    )