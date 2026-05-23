from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import uuid

from organizations.models import Organization, Membership
from projects.models import Project
from projectMembers.models import ProjectMember
from tasks.models import Task

User = get_user_model()

class TaskPatchAPITests(APITestCase):

    def setUp(self):
        # ---------- USERS ----------
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

        # ---------- ORGANIZATION ----------
        self.organization = Organization.objects.create(
            name="Test Organization",
            country="Uganda",
            created_by=self.creator_user,
        )

        # ---------- MEMBERSHIPS ----------
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

        # ---------- PROJECT ----------
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization,
            owner=self.creator_membership,
            created_by=self.creator_user,
        )

        # ---------- PROJECT MEMBERS ----------
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

        # ---------- TASK ----------
        self.task = Task.objects.create(
            name="Initial Task",
            description="Initial description",
            due_date=timezone.now() + timedelta(days=5),
            expected_hours=Decimal("5.0"),
            organisation=self.organization,
            project=self.project,
            reported_by=self.creator_member,
            created_by=self.creator_user,
        )

        # ---------- URL ----------
        self.url = reverse(
            "tasks:task-detail",
            kwargs={
                "project_id": self.project.id,
                "task_id": self.task.id,
            },
        )

    # ---------- AUTH HELPER ----------
    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}"
        )

    # AUTHENTICATION
    def test_patch_task_unauthenticated(self):
        response = self.client.patch(self.url, {"name": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # PERMISSIONS
    def test_patch_task_as_project_member_success(self):
        self.authenticate(self.member_user)

        response = self.client.patch(
            self.url,
            {"name": "Updated Task"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patch_task_as_non_member_forbidden(self):
        self.authenticate(self.outsider_user)

        response = self.client.patch(
            self.url,
            {"name": "Hack attempt"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # SUCCESS — BASIC UPDATE
    def test_patch_task_name_updated(self):
        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"name": "Updated Name"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.name, "Updated Name")

    def test_patch_multiple_fields(self):
        self.authenticate(self.creator_user)

        payload = {
            "name": "New Name",
            "expected_hours": 8.5,
        }

        response = self.client.patch(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.task.refresh_from_db()
        self.assertEqual(self.task.name, "New Name")
        self.assertEqual(self.task.expected_hours, Decimal("8.5"))

    def test_patch_empty_payload_succeeds(self):
        self.authenticate(self.creator_user)

        response = self.client.patch(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patch_does_not_overwrite_untouched_fields(self):
        self.authenticate(self.creator_user)

        original_description = self.task.description
        original_expected_hours = self.task.expected_hours

        response = self.client.patch(
            self.url,
            {"name": "Only Name Changed"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.task.refresh_from_db()
        self.assertEqual(self.task.description, original_description)
        self.assertEqual(self.task.expected_hours, original_expected_hours)

    # RESPONSE SHAPE
    def test_patch_response_contains_expected_fields(self):
        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"name": "Shape Test"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        expected_fields = [
            "id", "reference", "name", "description", "due_date",
            "expected_hours", "status", "organisation", "project",
            "assigned_to", "reported_by", "created_by", "created_at", "closed_at", "attachments",
        ]
        for field in expected_fields:
            self.assertIn(field, response.data)

    # STATUS LOGIC
    def test_patch_status_to_closed_sets_closed_at(self):
        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"status": "closed"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.task.refresh_from_db()
        self.assertEqual(self.task.status, "closed")
        self.assertIsNotNone(self.task.closed_at)

    def test_patch_status_from_closed_resets_closed_at(self):
        self.task.status = "closed"
        self.task.closed_at = timezone.now()
        self.task.save()

        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"status": "backlog"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.task.refresh_from_db()
        self.assertIsNone(self.task.closed_at)

    def test_patch_invalid_status_rejected(self):
        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"status": "flying"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    # ASSIGNED_TO VALIDATION
    def test_patch_assign_to_valid_project_member(self):
        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"assigned_to": str(self.member.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.assigned_to, self.member)

    def test_patch_assign_to_member_outside_project_rejected(self):
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.creator_membership,
            created_by=self.creator_user,
        )
        other_member = ProjectMember.objects.create(
            membership=self.outsider_membership,
            organisation=self.organization,
            project=other_project,
            role="contributor",
            created_by=self.creator_user,
        )

        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"assigned_to": str(other_member.id)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("assigned_to", response.data)

    def test_patch_unassign_task(self):
        self.task.assigned_to = self.member
        self.task.save()

        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"assigned_to": None},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertIsNone(self.task.assigned_to)

    # VALIDATION
    def test_patch_expected_hours_zero_rejected(self):
        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"expected_hours": 0},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expected_hours", response.data)

    def test_patch_due_date_in_past_rejected(self):
        self.authenticate(self.creator_user)

        response = self.client.patch(
            self.url,
            {"due_date": (timezone.now() - timedelta(days=1)).isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("due_date", response.data)

    # NOT FOUND
    def test_patch_task_not_found(self):
        self.authenticate(self.creator_user)

        url = reverse(
            "tasks:task-detail",
            kwargs={
                "project_id": self.project.id,
                "task_id": uuid.uuid4(),
            },
        )

        response = self.client.patch(url, {"name": "Test"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_project_not_found(self):
        self.authenticate(self.creator_user)

        url = reverse(
            "tasks:task-detail",
            kwargs={
                "project_id": uuid.uuid4(),
                "task_id": self.task.id,
            },
        )

        response = self.client.patch(url, {"name": "Test"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)