from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from django.urls import reverse

from sysadmin.models import AIModel

User = get_user_model()


class TestAdminListAIModels(APITestCase):

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

        AIModel.objects.create(
            name="GPT 4o",
            provider="openai",
            api_key="sk-1",
            created_by=self.superuser
        )

        AIModel.objects.create(
            name="Claude",
            provider="anthropic",
            api_key="sk-2",
            created_by=self.superuser
        )

        self.url = reverse("sysadmin:ai-models")

    def test_superuser_list_ai_models(self):
        self.client.force_authenticate(self.superuser)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_none_superuser_list_ai_models(self):
        self.client.force_authenticate(self.normal_user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_ai_models_search(self):
        self.client.force_authenticate(self.superuser)

        response = self.client.get(self.url, {"search": "gpt"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "GPT 4o")

    def test_list_ai_models_requires_auth(self):
        self.client.credentials()

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)