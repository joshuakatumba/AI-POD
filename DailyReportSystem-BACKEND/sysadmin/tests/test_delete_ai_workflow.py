import uuid

from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from sysadmin.models import AIModel, AIWorkflow

User = get_user_model()


class TestDeleteAIWorkflow(APITestCase):

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

        self.workflow = AIWorkflow.objects.create(
            name="Test Workflow",
            ai_model=self.model,
            created_by=self.superuser
        )

        self.url = reverse("sysadmin:ai-workflow", args=[self.workflow.id])

    def test_superuser_can_soft_delete_workflow(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.workflow.refresh_from_db()
        self.assertTrue(self.workflow.is_deleted)
        self.assertFalse(self.workflow.is_active)
        self.assertIsNotNone(self.workflow.is_deleted_at)
        self.assertEqual(self.workflow.is_deleted_by_email, self.superuser.email)

    def test_deleted_workflow_not_returned_in_list(self):
        self.client.force_authenticate(self.superuser)
        self.client.delete(self.url)
        list_url = reverse("sysadmin:ai-workflows")
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        workflow_ids = [w["id"] for w in response.data]
        self.assertNotIn(str(self.workflow.id), workflow_ids)

    def test_delete_already_deleted_workflow_returns_404(self):
        self.client.force_authenticate(self.superuser)
        self.workflow.is_deleted = True
        self.workflow.save()
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_superuser_cannot_delete_workflow(self):
        self.client.force_authenticate(self.normal_user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_requires_authentication(self):
        self.client.credentials()
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_nonexistent_workflow_returns_404(self):
        self.client.force_authenticate(self.superuser)
        url = reverse("sysadmin:ai-workflow", args=[uuid.uuid4()])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)