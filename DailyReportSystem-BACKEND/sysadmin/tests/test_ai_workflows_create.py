from rest_framework import status
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from django.urls import reverse

from sysadmin.models import AIModel, AIWorkflow

User = get_user_model()


class TestAdminCreateAIWorkflow(APITestCase):

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

        self.url = reverse("sysadmin:ai-workflows")

        self.model = AIModel.objects.create(
            name="GPT 4o",
            provider="openai",
            api_key="sk-test",
            created_by=self.superuser
        )

    def test_superuser_create_workflow_success(self):
        payload = {
            "name": "Requirements Generator",
            "description": "Generate requirements",
            "category": "requirements",
            "system_prompt": "You are a senior PM.",
            "ai_model": str(self.model.id)
        }

        self.client.force_authenticate(self.superuser)

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AIWorkflow.objects.count(), 1)

        workflow = AIWorkflow.objects.first()

        self.assertEqual(workflow.name, payload["name"])
        self.assertEqual(workflow.category, payload["category"])

    def test_none_superuser_create_workflow_unsuccess(self):
        payload = {
            "name": "Requirements Generator",
            "description": "Generate requirements",
            "category": "requirements",
            "system_prompt": "You are a senior PM.",
            "ai_model": str(self.model.id)
        }

        self.client.force_authenticate(self.normal_user)

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(AIWorkflow.objects.count(), 0)

    def test_create_workflow_requires_auth(self):
        self.client.credentials()

        payload = {
            "name": "Requirements Generator",
            "category": "requirements",
            "system_prompt": "You are a senior PM.",
            "ai_model": str(self.model.id)
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)