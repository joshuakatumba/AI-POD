import pytest
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model

from notifications.service import EmailService

User = get_user_model()

pytestmark = pytest.mark.django_db


RESET_LINK = "http://localhost:3000/password-reset?uid=abc&reset_token=xyz"


@pytest.fixture
def user():
    return User.objects.create_user(
        email="user@example.com",
        password="password123",
        full_name="Test User",
    )


@pytest.fixture
def mock_render_to_string():
    with patch("notifications.service.render_to_string") as mock_render:
        mock_render.side_effect = (
            lambda template_name, context: (
                f"{template_name} | {context.get('full_name', '')} | {context.get('reset_link', '')}"
            )
        )
        yield mock_render


def test_send_calls_ses_with_correct_parameters():
    with patch.object(EmailService, "_send") as mock_send:
        EmailService().send("user@example.com", "Subject", "text body", "<p>html</p>")

    mock_send.assert_called_once_with("user@example.com", "Subject", "text body", "<p>html</p>")


def test_send_works_without_html_body():
    with patch.object(EmailService, "_send") as mock_send:
        EmailService().send("user@example.com", "Subject", "text only")

    mock_send.assert_called_once_with("user@example.com", "Subject", "text only", None)


# -----------------------
# _send (SES dispatch)
# -----------------------

def test_send_does_not_raise_on_ses_client_error():
    from botocore.exceptions import ClientError

    error_response = {"Error": {"Code": "MessageRejected", "Message": "rejected"}}

    with patch("notifications.service.get_ses_client") as mock_factory:
        mock_client = MagicMock()
        mock_client.send_email.side_effect = ClientError(error_response, "SendEmail")
        mock_factory.return_value = mock_client

        EmailService()._send("user@example.com", "Subject", "text body", "<p>html</p>")


def test_send_includes_html_body_when_provided():
    with patch("notifications.service.get_ses_client") as mock_factory:
        mock_client = MagicMock()
        mock_factory.return_value = mock_client

        EmailService()._send("user@example.com", "Subject", "text", "<p>html</p>")

    call_kwargs = mock_client.send_email.call_args.kwargs
    assert "Html" in call_kwargs["Message"]["Body"]


def test_send_omits_html_body_when_not_provided():
    with patch("notifications.service.get_ses_client") as mock_factory:
        mock_client = MagicMock()
        mock_factory.return_value = mock_client

        EmailService()._send("user@example.com", "Subject", "text only")

    call_kwargs = mock_client.send_email.call_args.kwargs
    assert "Html" not in call_kwargs["Message"]["Body"]
