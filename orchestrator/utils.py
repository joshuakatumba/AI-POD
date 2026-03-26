
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

    # First Greeting
    greeting = (
        f"Hi — let's get your 24-hour report for {session.project.name} started. "
        f"We have {task_count} tasks to cover. "
        "Could you give me a quick high-level overview of what you worked on in the last 24 hours?"
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