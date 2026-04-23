import os

from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode


def build_password_reset_link(user, reset_token):
    encoded_id = urlsafe_base64_encode(force_bytes(user.pk))
    frontend_base_url = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000").rstrip("/")
    reset_link = f"{frontend_base_url}/reset-password?uid={encoded_id}&reset_token={reset_token}"
    return reset_link


def send_password_reset_email(user, reset_token):
    reset_link = build_password_reset_link(user, reset_token)
    subject = "Password reset request"
    message = (
        "A password reset was requested for your account.\n\n"
        "Reset link:\n"
        f"{reset_link}\n\n"
        "If you did not request this change, you can ignore this email."
    )
    from_email = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@example.com")
    send_mail(subject, message, from_email, [user.email], fail_silently=True)