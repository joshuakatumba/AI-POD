from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone

from sysadmin.models import AIModel, AIWorkflow

User = get_user_model()


class TestDeleteAIModels(APITestCase):

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

    def test_superuser_can_soft_delete_ai_model(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.model.refresh_from_db()
        self.assertTrue(self.model.is_deleted)
        self.assertFalse(self.model.is_active)
        self.assertIsNotNone(self.model.is_deleted_at)
        self.assertEqual(self.model.is_deleted_by_email, self.superuser.email)

    def test_cannot_delete_ai_model_in_use(self):
        AIWorkflow.objects.create(
            name="Test Workflow",
            ai_model=self.model,
            created_by=self.superuser
        )
        self.client.force_authenticate(self.superuser)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot be deleted", response.data["detail"])

    def test_non_superuser_cannot_delete_ai_model(self):
        self.client.force_authenticate(self.normal_user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_requires_authentication(self):
        self.client.credentials()
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)