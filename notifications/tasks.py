import logging

from celery import shared_task
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string

from .service import EmailService

logger = logging.getLogger(__name__)

User = get_user_model()


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="notifications.send_email_task",
)
def send_email_task(self, email_type, user_id, **kwargs):
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        logger.warning("send_email_task: user %s not found", user_id)
        return {"status": "not_found", "user_id": str(user_id), "email_type": email_type}

    if email_type == "password_reset":
        reset_link = kwargs.get("reset_link")
        if not reset_link:
            logger.error("send_email_task: reset_link not provided for password_reset email")
            return {"status": "error", "message": "reset_link not provided", "email_type": email_type}

        context = {
            "full_name": user.full_name or user.email,
            "reset_link": reset_link,
        }
        html_body = render_to_string("password_reset.html", context)
        text_body = (
            "A password reset was requested for your account.\n\n"
            "Reset link:\n"
            f"{reset_link}\n\n"
            "If you did not request this change, you can ignore this email."
        )
        EmailService().send(user.email, "Password reset request", text_body, html_body)
        return {"status": "sent", "user_id": str(user_id), "email_type": email_type}

    logger.error("send_email_task: unknown email_type %s", email_type)
    return {"status": "error", "message": f"Unknown email type: {email_type}", "email_type": email_type}