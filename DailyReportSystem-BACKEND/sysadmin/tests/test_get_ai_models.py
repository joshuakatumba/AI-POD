from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from sysadmin.models import AIModel

User = get_user_model()


class TestGetAIModels(APITestCase):

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="root@example.com", password="pass"
        )
        self.normal_user = User.objects.create_user(
            email="user@example.com", password="pass"
        )

        self.model1 = AIModel.objects.create(
            name="GPT 4o",
            provider="openai",
            api_key="sk-1",
            created_by=self.superuser
        )
        self.model2 = AIModel.objects.create(
            name="Claude",
            provider="anthropic",
            api_key="sk-2",
            created_by=self.superuser
        )

        self.url = reverse("sysadmin:ai-models")

    def test_superuser_can_list_ai_models(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_non_superuser_cannot_list_ai_models(self):
        self.client.force_authenticate(self.normal_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_search_ai_models(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.url, {"search": "gpt"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "GPT 4o")

    def test_requires_authentication(self):
        self.client.credentials()  # remove auth
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)