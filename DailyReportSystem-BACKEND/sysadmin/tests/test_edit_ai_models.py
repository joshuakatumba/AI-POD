from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from sysadmin.models import AIModel

User = get_user_model()


class TestEditAIModels(APITestCase):

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="root@example.com", password="pass"
        )
        self.normal_user = User.objects.create_user(
            email="user@example.com", password="pass"
        )

        self.model = AIModel.objects.create(
            name="GPT 4o",
            provider="openai",
            api_key="sk-1",
            created_by=self.superuser
        )

        self.url = reverse("sysadmin:ai-model-detail", args=[self.model.id])

    def test_superuser_can_patch_ai_model(self):
        self.client.force_authenticate(self.superuser)
        data = {"name": "GPT 4o Updated", "is_active": False}
        response = self.client.patch(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.model.refresh_from_db()
        self.assertEqual(self.model.name, "GPT 4o Updated")
        self.assertFalse(self.model.is_active)

    def test_non_superuser_cannot_patch_ai_model(self):
        self.client.force_authenticate(self.normal_user)
        response = self.client.patch(self.url, {"name": "Hacked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_requires_authentication(self):
        self.client.credentials()
        response = self.client.patch(self.url, {"name": "No Auth"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)