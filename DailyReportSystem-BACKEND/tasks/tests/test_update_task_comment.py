from datetime import timedelta
from decimal import Decimal
import uuid

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


class TaskCommentUpdateAPITests(APITestCase):
    def setUp(self):
        self.client.raise_request_exception = False

        self.creator_user = User.objects.create_user(
            email="creator@example.com",
            password="password123",
        )
        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123",
        )
        self.other_member_user = User.objects.create_user(
            email="othermember@example.com",
            password="password123",
        )
        self.external_user = User.objects.create_user(
            email="external@example.com",
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
        self.other_member_membership = Membership.objects.create(
            user=self.other_member_user,
            organization=self.organization,
            role="member",
            created_by=self.creator_user,
            is_active=True,
        )
        self.external_membership = Membership.objects.create(
            user=self.external_user,
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
        self.other_member = ProjectMember.objects.create(
            membership=self.other_member_membership,
            organisation=self.organization,
            project=self.project,
            role="contributor",
            created_by=self.creator_user,
        )

        self.task = Task.objects.create(
            name="Task for comment update",
            description="Task used by comment update tests",
            due_date=timezone.now() + timedelta(days=5),
            expected_hours=Decimal("6.0"),
            organisation=self.organization,
            project=self.project,
            reported_by=self.creator_member,
            created_by=self.creator_user,
        )

        self.comment = TaskComment.objects.create(
            task=self.task,
            content="Original comment",
            organisation=self.organization,
            membership=self.member,
            created_by=self.member_user,
        )

        self.url = reverse(
            "task_comments:task_comment_detail",
            kwargs={
                "task_id": self.task.id,
                "comment_id": self.comment.id,
            },
        )

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_patch_comment_requires_authentication(self):
        response = self.client.patch(self.url, {"content": "Updated"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_comment_requires_project_membership(self):
        self.authenticate(self.external_user)

        response = self.client.patch(self.url, {"content": "Updated"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_comment_author_can_update(self):
        self.authenticate(self.member_user)

        payload = {"content": "Updated comment content"}
        response = self.client.patch(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.comment.refresh_from_db()
        self.assertEqual(self.comment.content, payload["content"])
        self.assertEqual(response.data["content"], payload["content"])

    def test_patch_comment_non_author_project_member_forbidden(self):
        self.authenticate(self.other_member_user)

        response = self.client.patch(self.url, {"content": "Unauthorized edit"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.comment.refresh_from_db()
        self.assertEqual(self.comment.content, "Original comment")

    def test_patch_comment_blank_content_rejected(self):
        self.authenticate(self.member_user)

        response = self.client.patch(self.url, {"content": "   "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.comment.refresh_from_db()
        self.assertEqual(self.comment.content, "Original comment")

    def test_patch_comment_not_found(self):
        self.authenticate(self.member_user)

        url = reverse(
            "task_comments:task_comment_detail",
            kwargs={
                "task_id": self.task.id,
                "comment_id": uuid.uuid4(),
            },
        )
        response = self.client.patch(url, {"content": "Updated"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)