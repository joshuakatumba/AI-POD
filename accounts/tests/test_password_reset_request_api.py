from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class PasswordResetRequestAPITests(APITestCase):
    def setUp(self):
        self.url = reverse("password-reset-request")
        self.user = User.objects.create_user(email="reset@example.com", password="password123")
        mail.outbox = []

    def test_request_for_existing_user_returns_link_and_sends_email(self):
        response = self.client.post(self.url, {"email": self.user.email})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Password reset request accepted.")
        
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.user.email])
        self.assertIn("Reset link:", mail.outbox[0].body)

    def test_request_for_unknown_email_returns_not_found(self):
        response = self.client.post(self.url, {"email": "unknown@example.com"})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["detail"], "No User matches the given query.")
        self.assertEqual(len(mail.outbox), 0)

    def test_request_with_invalid_email_returns_bad_request(self):
        response = self.client.post(self.url, {"email": "not-an-email"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
