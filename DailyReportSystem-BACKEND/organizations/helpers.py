import os
from notifications.tasks import send_email_task


def send_invite_member_email(user, organization_name, preferred_language=None):
    login_link = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/") + "/en/login"
    send_email_task.delay(
        "invite_member",
        user_id=str(user.id),
        organization_name=organization_name,
        login_link=login_link,
        preferred_language=preferred_language,
    )