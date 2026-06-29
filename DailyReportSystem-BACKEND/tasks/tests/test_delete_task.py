from rest_framework.test import APITestCase
from datetime import timedelta, timezone
from decimal import Decimal
import uuid

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from organizations.models import Membership, Organization
from projectMembers.models import ProjectMember
from projects.models import Project
from tasks.models import Task

User = get_user_model()


class TaskDeleteAPITests(APITestCase):
    def setUp(self):
        self.client.raise_request_exception = False

        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123",
        )
        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123",
        )
        self.external_user = User.objects.create_user(
            email="external@example.com",
            password="password123",
        )

        self.organization = Organization.objects.create(
            name="Test Organization",
            country="Uganda",
            created_by=self.admin_user,
        )

        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.organization,
            role="admin",
            created_by=self.admin_user,
            is_active=True,
        )
        self.member_membership = Membership.objects.create(
            user=self.member_user,
            organization=self.organization,
            role="member",
            created_by=self.admin_user,
            is_active=True,
        )
        self.external_membership = Membership.objects.create(
            user=self.external_user,
            organization=self.organization,
            role="member",
            created_by=self.admin_user,
            is_active=True,
        )

        self.project = Project.objects.create(
            name="Project Alpha",
            organization=self.organization,
            owner=self.admin_membership,
            created_by=self.admin_user,
        )

        self.admin_member = ProjectMember.objects.create(
            membership=self.admin_membership,
            organisation=self.organization,
            project=self.project,
            role="admin",
            created_by=self.admin_user,
        )
        self.member = ProjectMember.objects.create(
            membership=self.member_membership,
            organisation=self.organization,
            project=self.project,
            role="contributor",
            created_by=self.admin_user,
        )

        self.task = Task.objects.create(
            name="Task to delete",
            description="Task used by delete tests",
            due_date=timezone.now() + timedelta(days=5),
            expected_hours=Decimal("4.0"),
            organisation=self.organization,
            project=self.project,
            reported_by=self.admin_member,
            created_by=self.admin_user,
        )

        self.url = reverse(
            "tasks:task-detail",
            kwargs={
                "project_id": self.project.id,
                "task_id": self.task.id,
            },
        )

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_delete_task_requires_authentication(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_task_requires_project_membership(self):
        self.authenticate(self.external_user)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_task_success_as_project_admin(self):
        self.authenticate(self.admin_user)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Task successfully deleted.")
        self.assertEqual(response.data["deleted_by"], self.admin_user.email)

        self.task.refresh_from_db()
        self.assertTrue(self.task.is_deleted)
        self.assertFalse(self.task.is_active)
        self.assertEqual(self.task.status, "cancelled")

    def test_delete_task_not_found(self):
        self.authenticate(self.admin_user)

        url = reverse(
            "tasks:task-detail",
            kwargs={
                "project_id": self.project.id,
                "task_id": uuid.uuid4(),
            },
        )
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_already_deleted_task_returns_404(self):
        self.authenticate(self.admin_user)

        # Delete it first
        self.task.is_deleted = True
        self.task.is_active = False
        self.task.save()

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)