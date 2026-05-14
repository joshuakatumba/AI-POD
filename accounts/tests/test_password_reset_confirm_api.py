from urllib.parse import parse_qs, urlparse

from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch

User = get_user_model()


class PasswordResetConfirmAPITests(APITestCase):
    def setUp(self):
        self.request_url = reverse("password-reset-request")
        self.confirm_url = reverse("password-reset-confirm")
        self.user = User.objects.create_user(email="reset-confirm@example.com", password="password123")
        mail.outbox = []

    def _extract_uid_and_token(self, reset_link):
        parsed = urlparse(reset_link)
        params = parse_qs(parsed.query)
        uid = params.get("uid", [None])[0]
        reset_token = params.get("reset_token", [None])[0]

        self.assertIsNotNone(uid)
        self.assertIsNotNone(reset_token)
        return uid, reset_token

    def _request_reset_and_get_uid_token(self):
        with patch('accounts.helpers.send_email_task') as mock_task:
            request_response = self.client.post(self.request_url, {"email": self.user.email})

            self.assertEqual(request_response.status_code, status.HTTP_200_OK)
            self.assertEqual(request_response.data["detail"], "Password reset request accepted.")
            mock_task.delay.assert_called_once()
            call_kwargs = mock_task.delay.call_args[1]
            reset_link = call_kwargs.get("reset_link")
            self.assertIsNotNone(reset_link)

            return self._extract_uid_and_token(reset_link)

    def test_confirm_success_with_uid_and_token(self):
        uid, reset_token = self._request_reset_and_get_uid_token()

        response = self.client.post(
            self.confirm_url,
            {
                "uid": uid,
                "reset_token": reset_token,
                "new_password": "newpassword123",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Password has been reset successfully.")

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpassword123"))
        self.assertFalse(self.user.check_password("password123"))

    def test_confirm_with_invalid_token_returns_bad_request(self):
        uid, _ = self._request_reset_and_get_uid_token()

        response = self.client.post(
            self.confirm_url,
            {
                "uid": uid,
                "reset_token": "invalid-token",
                "new_password": "newpassword123",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("message", response.data)
        self.assertIn(
            "Invalid or expired password reset token.",
            response.data["message"],
        )

    def test_confirm_with_invalid_uid_returns_bad_request(self):
        _, reset_token = self._request_reset_and_get_uid_token()

        response = self.client.post(
            self.confirm_url,
            {
                "uid": "invalid-uid",
                "reset_token": reset_token,
                "new_password": "newpassword123",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("message", response.data)
        self.assertIn(
            "Invalid or expired password reset token.",
            response.data["message"],
        )

    def test_confirm_with_weak_password_returns_bad_request(self):
        uid, reset_token = self._request_reset_and_get_uid_token()

        response = self.client.post(
            self.confirm_url,
            {
                "uid": uid,
                "reset_token": reset_token,
                "new_password": "12345678",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.data)
