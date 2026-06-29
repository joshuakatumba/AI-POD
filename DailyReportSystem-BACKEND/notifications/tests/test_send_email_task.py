import pytest
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture
def user():
    return User.objects.create_user(
        email="user@example.com",
        password="password123",
        full_name="Test User",
    )


@patch("notifications.tasks.render_to_string")
@patch("notifications.tasks.EmailService")
def test_send_email_task_password_reset_renders_and_sends(mock_service_class, mock_render):
    mock_render.return_value = "<p>Reset email HTML</p>"
    
    reset_link = "http://localhost:3000/password-reset?uid=abc&reset_token=xyz"
    mock_service = MagicMock()
    mock_service_class.return_value = mock_service
    
    def get_user():
        return User.objects.create_user(
            email="user@example.com",
            password="password123",
            full_name="Test User",
        )
    user = get_user()

    from notifications.tasks import send_email_task
    result = send_email_task("password_reset", str(user.id), reset_link=reset_link)

    assert result["status"] == "sent"
    assert result["email_type"] == "password_reset"
    assert mock_render.call_args[0][0] == ["en/password_reset.html"]
    mock_service.send.assert_called_once()
    call_args = mock_service.send.call_args
    assert call_args[0][0] == user.email
    assert call_args[0][1] == "Password reset request"
    assert reset_link in call_args[0][2]


@patch("notifications.tasks.render_to_string")
@patch("notifications.tasks.EmailService")
def test_send_email_task_password_reset_japanese_content(mock_service_class, mock_render):
    mock_render.return_value = "<p>リセットメール HTML</p>"

    reset_link = "http://localhost:3000/password-reset?uid=abc&reset_token=xyz"
    mock_service = MagicMock()
    mock_service_class.return_value = mock_service

    user = User.objects.create_user(
        email="user-ja@example.com",
        password="password123",
        full_name="テストユーザー",
        preferred_language="ja",
    )

    from notifications.tasks import send_email_task
    result = send_email_task("password_reset", str(user.id), reset_link=reset_link)

    assert result["status"] == "sent"
    assert result["email_type"] == "password_reset"
    assert mock_render.call_args[0][0] == ["ja/password_reset.html", "en/password_reset.html"]
    mock_service.send.assert_called_once()
    call_args = mock_service.send.call_args
    assert call_args[0][0] == user.email
    assert call_args[0][1] == "パスワード再設定のご依頼"
    assert "再設定リンク" in call_args[0][2]
    assert reset_link in call_args[0][2]


@patch("notifications.tasks.render_to_string")
@patch("notifications.tasks.EmailService")
def test_send_email_task_password_reset_unknown_language_falls_back_to_english(mock_service_class, mock_render):
    mock_render.return_value = "<p>Reset email HTML</p>"

    reset_link = "http://localhost:3000/password-reset?uid=abc&reset_token=xyz"
    mock_service = MagicMock()
    mock_service_class.return_value = mock_service

    user = User.objects.create_user(
        email="user-sw@example.com",
        password="password123",
        full_name="Test User Sw",
        preferred_language="sw",
    )

    from notifications.tasks import send_email_task
    result = send_email_task("password_reset", str(user.id), reset_link=reset_link)

    assert result["status"] == "sent"
    assert result["email_type"] == "password_reset"
    assert mock_render.call_args[0][0] == ["en/password_reset.html"]
    mock_service.send.assert_called_once()
    call_args = mock_service.send.call_args
    assert call_args[0][1] == "Password reset request"
    assert reset_link in call_args[0][2]


def test_send_email_task_returns_user_not_found_for_missing_user():
    from notifications.tasks import send_email_task
    non_existent_id = "00000000-0000-0000-0000-000000000000"
    
    result = send_email_task("password_reset", non_existent_id, reset_link="http://example.com/reset")

    assert result["status"] == "not_found"
    assert result["user_id"] == non_existent_id
    assert result["email_type"] == "password_reset"


def test_send_email_task_returns_error_for_missing_reset_link(user):
    from notifications.tasks import send_email_task
    result = send_email_task("password_reset", str(user.id))

    assert result["status"] == "error"
    assert "reset_link not provided" in result["message"]


def test_send_email_task_returns_error_for_unknown_email_type(user):
    from notifications.tasks import send_email_task
    result = send_email_task("unknown_type", str(user.id), reset_link="http://example.com/reset")

    assert result["status"] == "error"
    assert "Unknown email type" in result["message"]


@patch("notifications.tasks.render_to_string")
@patch("notifications.tasks.EmailService")
def test_send_email_task_reraises_exceptions_for_retry(mock_service_class, mock_render):
    mock_render.return_value = "<p>Reset email HTML</p>"
    
    def get_user():
        return User.objects.create_user(
            email="user@example.com",
            password="password123",
            full_name="Test User",
        )
    user = get_user()
    
    mock_service = MagicMock()
    mock_service_class.return_value = mock_service
    mock_service.send.side_effect = RuntimeError("SES error")
    
    from notifications.tasks import send_email_task
    with pytest.raises(RuntimeError):
        send_email_task("password_reset", str(user.id), reset_link="http://example.com/reset")


@patch("notifications.tasks.logger")
def test_send_email_task_logs_user_not_found_warning(mock_logger):
    from notifications.tasks import send_email_task
    non_existent_id = "00000000-0000-0000-0000-000000000000"
    
    send_email_task("password_reset", non_existent_id, reset_link="http://example.com/reset")
    
    mock_logger.warning.assert_called()
    call_args = mock_logger.warning.call_args[0]
    assert "user" in call_args[0].lower()
    assert "not found" in call_args[0].lower()
