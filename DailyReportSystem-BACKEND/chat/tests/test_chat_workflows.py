from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from sysadmin.models import AIModel, AIWorkflow

User = get_user_model()


class ChatWorkflowListTests(APITestCase):
    """GET /api/chat/ai-workflows/ — open to any authenticated user."""

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="pass"
        )
        self.normal_user = User.objects.create_user(
            email="user@example.com", password="pass"
        )
        self.url = reverse("chat:workflows")

        self.ai_model = AIModel.objects.create(
            name="GPT-4o",
            provider="openai",
            api_key="sk-test",
            created_by=self.superuser,
        )
        AIWorkflow.objects.create(
            name="Requirements Generator",
            category="requirements",
            system_prompt="Generate requirements.",
            ai_model=self.ai_model,
            created_by=self.superuser,
        )
        AIWorkflow.objects.create(
            name="Report Writer",
            category="report",
            system_prompt="Write a report.",
            ai_model=self.ai_model,
            created_by=self.superuser,
        )

    def test_authenticated_user_can_list_workflows(self):
        self.client.force_authenticate(self.normal_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_superuser_can_list_workflows(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_deleted_workflows_are_excluded(self):
        self.client.force_authenticate(self.normal_user)

        workflow = AIWorkflow.objects.first()
        workflow.is_deleted = True
        workflow.save()

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_response_contains_expected_fields(self):
        self.client.force_authenticate(self.normal_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        workflow = response.data[0]
        for field in ("id", "reference", "name", "category", "system_prompt"):
            self.assertIn(field, workflow)


class ChatWorkflowRetrieveTests(APITestCase):
    """GET /api/chat/ai-workflows/<uuid>/ — open to any authenticated user."""

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            email="admin@example.com", password="pass"
        )
        self.normal_user = User.objects.create_user(
            email="user@example.com", password="pass"
        )

        self.ai_model = AIModel.objects.create(
            name="GPT-4o",
            provider="openai",
            api_key="sk-test",
            created_by=self.superuser,
        )
        self.workflow = AIWorkflow.objects.create(
            name="Report Writer",
            category="report",
            system_prompt="Write a report.",
            ai_model=self.ai_model,
            created_by=self.superuser,
        )
        self.url = reverse("chat:workflow", kwargs={"workflow_id": self.workflow.id})

    def test_authenticated_user_can_retrieve_workflow(self):
        self.client.force_authenticate(self.normal_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data["id"]), str(self.workflow.id))

    def test_superuser_can_retrieve_workflow(self):
        self.client.force_authenticate(self.superuser)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_deleted_workflow_returns_404(self):
        self.workflow.is_deleted = True
        self.workflow.save()

        self.client.force_authenticate(self.normal_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nonexistent_workflow_returns_404(self):
        import uuid

        self.client.force_authenticate(self.normal_user)
        url = reverse("chat:workflow", kwargs={"workflow_id": uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
