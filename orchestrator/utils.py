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

    handler = seed_handlers.get(session.session_type)
    if handler:
        return handler(session)


def _seed_report_generation(session):
    task_count = session.session_tasks.count()

    greeting = (
        f"Hi! I'm AI Pod, your daily report assistant. "
        f"I'm here to help you build your 24-hour report for **{session.project.name}**. "
        f"We have {task_count} task(s) to go through together. "
        f"Let's take it one task at a time — I'll ask you questions and you just answer naturally. "
        f"Ready to get started? Just say yes and we'll begin!"
    )

    return SessionMessage.objects.create(
        session=session,
        organisation=session.organisation,
        membership=session.membership,
        role='assistant',
        content=greeting,
        created_by=session.created_by
    )


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