from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from organizations.models import Membership, Organization
from projectMembers.models import ProjectMember
from projects.models import Project
from tasks.models import Task, TaskComment

User = get_user_model()


class TaskCommentCreateAPITests(APITestCase):
    def setUp(self):
        self.creator_user = User.objects.create_user(
            email="creator@example.com",
            password="password123",
        )
        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123",
        )
        self.outsider_user = User.objects.create_user(
            email="outsider@example.com",
            password="password123",
        )

        self.organization = Organization.objects.create(
            name="Test Organization",
            country="Uganda",
            created_by=self.creator_user,
        )

        self.creator_membership = Membership.objects.create(
            user=self.creator_user,
            organization=self.organization,
            role="admin",
            created_by=self.creator_user,
            is_active=True,
        )
        self.member_membership = Membership.objects.create(
            user=self.member_user,
            organization=self.organization,
            role="member",
            created_by=self.creator_user,
            is_active=True,
        )
        self.outsider_membership = Membership.objects.create(
            user=self.outsider_user,
            organization=self.organization,
            role="member",
            created_by=self.creator_user,
            is_active=True,
        )

        self.project = Project.objects.create(
            name="Project Alpha",
            organization=self.organization,
            owner=self.creator_membership,
            created_by=self.creator_user,
        )

        self.creator_member = ProjectMember.objects.create(
            membership=self.creator_membership,
            organisation=self.organization,
            project=self.project,
            role="admin",
            created_by=self.creator_user,
        )
        self.member = ProjectMember.objects.create(
            membership=self.member_membership,
            organisation=self.organization,
            project=self.project,
            role="contributor",
            created_by=self.creator_user,
        )

        self.task = Task.objects.create(
            name="Task for comment creation",
            description="Task used by comment create tests",
            due_date=timezone.now() + timedelta(days=5),
            expected_hours=Decimal("6.0"),
            organisation=self.organization,
            project=self.project,
            reported_by=self.creator_member,
            created_by=self.creator_user,
        )

        self.url = reverse(
            "task_comments:task_comments",
            kwargs={
                "task_id": self.task.id,
            },
        )

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_create_task_comment_requires_authentication(self):
        response = self.client.post(self.url, {"content": "Looks good"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_task_comment_requires_project_membership(self):
        self.authenticate(self.outsider_user)

        response = self.client.post(self.url, {"content": "I should not post"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_task_comment_content_is_required(self):
        self.authenticate(self.member_user)

        response = self.client.post(self.url, {"content": "   "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("content", response.data)

    def test_create_task_comment_success_sets_ownership_fields(self):
        self.authenticate(self.member_user)

        payload = {"content": "Need to confirm acceptance criteria."}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TaskComment.objects.count(), 1)

        comment = TaskComment.objects.get()
        self.assertEqual(comment.task, self.task)
        self.assertEqual(comment.content, payload["content"])
        self.assertEqual(comment.organisation, self.organization)
        self.assertEqual(comment.membership, self.member)
        self.assertEqual(comment.created_by, self.member_user)
        self.assertTrue(comment.reference.startswith("TCM"))
