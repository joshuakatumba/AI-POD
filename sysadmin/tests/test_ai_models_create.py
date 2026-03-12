from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from django.urls import reverse

from sysadmin.models import AIModel

User = get_user_model()


class TestAdminCreateAIModel(APITestCase):

    def setUp(self):
        # 1. Users
        self.superuser = User.objects.create_superuser(
            email="root@example.com",
            password="pass"
        )

        self.normal_user = User.objects.create_user(
            email="user@example.com",
            password="pass"
        )

        self.url = reverse("sysadmin:ai-models")

    def test_create_ai_model_success(self):
        payload = {
            "name": "GPT 4o",
            "provider": "openai",
            "api_key": "sk-test-key"
        }

        self.client.force_authenticate(self.superuser)

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AIModel.objects.count(), 1)

        model = AIModel.objects.first()

        self.assertEqual(model.name, payload["name"])
        self.assertEqual(model.provider, payload["provider"])
        self.assertTrue(model.api_key is not None)

    def test_create_ai_model_non_superadmin_forbidden(self):
        payload = {
            "name": "GPT 4o",
            "provider": "openai",
            "api_key": "sk-test-key"
        }

        self.client.force_authenticate(self.normal_user)
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(AIModel.objects.count(), 0)

    def test_create_ai_model_validation_error(self):
        payload = {
            "provider": "openai"
        }

        self.client.force_authenticate(self.superuser)

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AIModel.objects.count(), 0)

    def test_create_ai_model_requires_auth(self):
        self.client.credentials()

        payload = {
            "name": "GPT",
            "provider": "openai",
            "api_key": "sk-test"
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)