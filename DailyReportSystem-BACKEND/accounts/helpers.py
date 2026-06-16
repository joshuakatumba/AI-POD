import os

from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from notifications.tasks import send_email_task


def build_password_reset_link(user, reset_token):
    encoded_id = urlsafe_base64_encode(force_bytes(user.pk))
    frontend_base_url = os.getenv("FRONTEND_BASE_URL").rstrip("/")
    reset_link = f"{frontend_base_url}/password-reset?uid={encoded_id}&reset_token={reset_token}"
    return reset_link

def send_password_reset_email(user, reset_token, preferred_language=None):
    reset_link = build_password_reset_link(user, reset_token)
    send_email_task.delay(
        "password_reset",
        user_id=user.id,
        reset_link=reset_link,
        preferred_language=preferred_language,
    )