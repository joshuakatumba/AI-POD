from rest_framework import status
from django.contrib.auth import get_user_model

from rest_framework.test import APITestCase
from django.urls import reverse

from sysadmin.models import AIModel, AIWorkflow

User = get_user_model()


class TestAdminListAIWorkflows(APITestCase):

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

        model = AIModel.objects.create(
            name="GPT 4o",
            provider="openai",
            api_key="sk-test",
            created_by=self.superuser
        )

        AIWorkflow.objects.create(
            name="Requirements Generator",
            category="requirements",
            system_prompt="Prompt",
            ai_model=model,
            created_by=self.superuser
        )

        AIWorkflow.objects.create(
            name="Report Writer",
            category="report",
            system_prompt="Prompt",
            ai_model=model,
            created_by=self.superuser
        )

    def test_superuser_list_workflows(self):
        self.client.force_authenticate(self.superuser)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_none_superuser_list_workflows(self):
        self.client.force_authenticate(self.normal_user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
