import logging

from celery import shared_task
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
from .localization import get_email_content
from .service import EmailService

logger = logging.getLogger(__name__)

User = get_user_model()

_EMAIL_TYPE_REQUIRED_KWARGS = {
    "password_reset": ["reset_link"],
    "invite_member": ["organization_name", "login_link"],
    "task_assigned": ["task_name", "task_link", "assigner_name"],
    "task_deadline_approaching": ["task_name", "task_link", "due_date"],
}


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="notifications.send_email_task",
)
def send_email_task(self, email_type, user_id, **kwargs):
    """
    Send a localized email using only the kwargs required for the given email_type.

    The required list acts as a whitelist, and the dict comprehension filters
    kwargs to pass only those expected keys into the template/content render.
    """
    if email_type not in _EMAIL_TYPE_REQUIRED_KWARGS:
        logger.error("send_email_task: unknown email_type %s", email_type)
        return {"status": "error", "message": f"Unknown email type: {email_type}", "email_type": email_type}

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("send_email_task: user %s not found", user_id)
        return {"status": "not_found", "user_id": str(user_id), "email_type": email_type}

    required = _EMAIL_TYPE_REQUIRED_KWARGS[email_type]
    missing = [key for key in required if not kwargs.get(key)]
    if missing:
        logger.error("send_email_task: missing kwargs %s for %s", missing, email_type)
        return {"status": "error", "message": f"{missing[0]} not provided", "email_type": email_type}

    preferred_language = kwargs.get("preferred_language") or user.preferred_language
    email = get_email_content(
        email_type,
        preferred_language,
        **{k: kwargs[k] for k in required},
    )
    context = {
        "full_name": user.full_name or user.email,
        "language_code": email["language_code"],
        **{k: kwargs[k] for k in required},
    }
    html_body = render_to_string(email["template_paths"], context)
    EmailService().send(user.email, email["subject"], email["text_body"], html_body)
    return {"status": "sent", "user_id": str(user_id), "email_type": email_type}


@shared_task(name="notifications.send_deadline_reminders_task")
def send_deadline_reminders_task():
    """
    Checks for tasks due tomorrow and sends a reminder to the assignee.
    """
    from django.utils import timezone
    from datetime import timedelta
    from django.conf import settings
    from tasks.models import Task

    tomorrow = timezone.now().date() + timedelta(days=1)
    
    # Find tasks due tomorrow that are not closed or cancelled
    tasks_due_tomorrow = Task.objects.filter(
        due_date__date=tomorrow,
        is_deleted=False
    ).exclude(status__in=["closed", "cancelled"])

    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3002")

    for task in tasks_due_tomorrow:
        if task.assigned_to and task.assigned_to.membership and task.assigned_to.membership.user:
            user_id = task.assigned_to.membership.user.id
            task_link = f"{frontend_url}/projects/{task.project.id}/tasks?task={task.id}"
            
            send_email_task.delay(
                "task_deadline_approaching",
                user_id,
                task_name=task.name,
                task_link=task_link,
                due_date=str(task.due_date.date())
            )
    return {"status": "success", "tasks_processed": tasks_due_tomorrow.count()}
