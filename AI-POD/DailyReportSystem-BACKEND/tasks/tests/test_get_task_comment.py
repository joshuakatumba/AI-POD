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


class TaskCommentReadAPITests(APITestCase):
    def setUp(self):
        self.creator_user = User.objects.create_user(
            email="creator@example.com",
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
            name="Task for comment reads",
            description="Task used by comment read tests",
            due_date=timezone.now() + timedelta(days=5),
            expected_hours=Decimal("6.0"),
            organisation=self.organization,
            project=self.project,
            reported_by=self.creator_member,
            created_by=self.creator_user,
        )
        self.other_task = Task.objects.create(
            name="Another task",
            description="Other task",
            due_date=timezone.now() + timedelta(days=6),
            expected_hours=Decimal("3.0"),
            organisation=self.organization,
            project=self.project,
            reported_by=self.creator_member,
            created_by=self.creator_user,
        )

        self.comment_1 = TaskComment.objects.create(
            task=self.task,
            content="First comment",
            organisation=self.organization,
            membership=self.member,
            created_by=self.member_user,
        )
        self.comment_2 = TaskComment.objects.create(
            task=self.task,
            content="Second comment",
            organisation=self.organization,
            membership=self.creator_member,
            created_by=self.creator_user,
        )
        self.other_task_comment = TaskComment.objects.create(
            task=self.other_task,
            content="Other task comment",
            organisation=self.organization,
            membership=self.creator_member,
            created_by=self.creator_user,
        )

        self.list_url = reverse(
            "task_comments:task_comments",
            kwargs={
                "task_id": self.task.id,
            },
        )
        self.detail_url = reverse(
            "task_comments:task_comment_detail",
            kwargs={
                "task_id": self.task.id,
                "comment_id": self.comment_1.id,
            },
        )

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_list_comments_as_project_member_success(self):
        self.authenticate(self.member_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        returned_ids = {item["id"] for item in response.data}
        self.assertIn(str(self.comment_1.id), returned_ids)
        self.assertIn(str(self.comment_2.id), returned_ids)
        self.assertNotIn(str(self.other_task_comment.id), returned_ids)

    def test_list_comments_requires_project_membership(self):
        self.authenticate(self.external_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_comments_task_not_found(self):
        self.authenticate(self.member_user)

        url = reverse(
            "task_comments:task_comments",
            kwargs={
                "task_id": uuid.uuid4(),
            },
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


    def test_get_comment_as_project_member_success(self):
        self.authenticate(self.member_user)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.comment_1.id))
        self.assertEqual(response.data["content"], self.comment_1.content)
        self.assertEqual(str(response.data["task"]["id"]), str(self.task.id))
        self.assertEqual(str(response.data["membership"]["id"]), str(self.member.id))

    def test_get_comment_not_found(self):
        self.authenticate(self.member_user)

        url = reverse(
            "task_comments:task_comment_detail",
            kwargs={
                "task_id": self.task.id,
                "comment_id": uuid.uuid4(),
            },
        )
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_response_contains_expected_fields(self):
        self.authenticate(self.member_user)
        response = self.client.get(self.list_url)

        task_data = response.data[0]
        expected_fields = {
            "id", "reference", "modified_at", "is_deleted_by_email", "task", "is_deleted",
            "content", "membership", "is_deleted_reason", "is_deleted_at", "translations",
            "created_by", "organisation", "created_at"
        }
        self.assertEqual(set(task_data.keys()), expected_fields)
