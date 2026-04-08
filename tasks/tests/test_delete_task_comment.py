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


class TaskCommentDeleteAPITests(APITestCase):
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
            name="Task for comment deletion",
            description="Task used by comment delete tests",
            due_date=timezone.now() + timedelta(days=5),
            expected_hours=Decimal("6.0"),
            organisation=self.organization,
            project=self.project,
            reported_by=self.creator_member,
            created_by=self.creator_user,
        )

        self.comment = TaskComment.objects.create(
            task=self.task,
            content="Comment to delete",
            organisation=self.organization,
            membership=self.member,
            created_by=self.member_user,
        )

        self.url = reverse(
            "tasks:task-comment-detail",
            kwargs={
                "task_id": self.task.id,
                "comment_id": self.comment.id,
            },
        )

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_delete_comment_requires_authentication(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_comment_requires_project_membership(self):
        self.authenticate(self.external_user)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_comment_non_author_project_member_forbidden(self):
        self.authenticate(self.other_member_user)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.comment.refresh_from_db()
        self.assertFalse(self.comment.is_deleted)

    def test_delete_comment_author_can_delete_and_task_remains(self):
        self.authenticate(self.member_user)

        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Comment successfully removed from task.")
        self.assertEqual(response.data["comment_id"], str(self.comment.id))
        self.assertEqual(response.data["removed_by"], self.member_user.email)
        self.comment.refresh_from_db()
        self.assertTrue(self.comment.is_deleted)
        self.assertFalse(self.comment.is_active)
        self.assertIsNotNone(self.comment.is_deleted_at)
        self.assertEqual(self.comment.is_deleted_by_email, self.member_user.email)
        self.assertEqual(self.comment.is_deleted_reason, "Removed by author")
        self.assertTrue(Task.objects.filter(id=self.task.id).exists())

    def test_delete_comment_not_found(self):
        self.authenticate(self.member_user)

        url = reverse(
            "tasks:task-comment-detail",
            kwargs={
                "task_id": self.task.id,
                "comment_id": uuid.uuid4(),
            },
        )
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
# TODO: Add feature where admins can delete any comment and add tests for that when implemented. 