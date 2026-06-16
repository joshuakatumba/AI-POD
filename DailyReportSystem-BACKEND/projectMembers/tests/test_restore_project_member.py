from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse

from organizations.models import Organization, Membership
from projects.models import Project
from projectMembers.models import ProjectMember
from core.tests.utils import MockAuthMixin

User = get_user_model()


class TestRestoreProjectMember(MockAuthMixin, APITestCase):

    def setUp(self):
        # Admin user
        self.admin_user = User.objects.create_user(email="admin@example.com", password="password123")

        # Organisation
        self.org = Organization.objects.create(name="Test Org", created_by=self.admin_user)

        # Admin membership
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role="admin",
            created_by=self.admin_user,
        )

        # Project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.org,
            created_by=self.admin_user,
            owner=self.admin_membership,
        )
        self.admin_project_member = ProjectMember.objects.create(
            membership=self.admin_membership,
            organisation=self.org,
            project=self.project,
            role="admin",
            created_by=self.admin_user,
    )

        # Member user
        self.member_user = User.objects.create_user(email="member@example.com", password="password123")
        self.member_membership = Membership.objects.create(
            user=self.member_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
        )

        # Auth payload
        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id),
        }

        # URL
        self.url = reverse("projectMembers:project-members", kwargs={"project_id": self.project.id})

    def test_restore_deleted_member(self):
        """Deleted member should be restored instead of creating a new one"""

        deleted_member = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.member_membership,
            role="contributor",
            status="inactive",
            is_active=False,
            is_deleted=True,
            is_deleted_reason="Removed",
            is_deleted_by_email="admin@example.com",
            created_by=self.admin_user,
        )

        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.post(
                self.url,
                {"email": self.member_user.email, "role": "admin"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        deleted_member.refresh_from_db()

        self.assertFalse(deleted_member.is_deleted)
        self.assertTrue(deleted_member.is_active)
        self.assertEqual(deleted_member.status, "active")
        self.assertEqual(deleted_member.role, "admin")

    def test_restore_does_not_create_duplicate_member(self):
        """Restoring a deleted member should not create a new DB record"""

        ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.member_membership,
            role="contributor",
            status="inactive",
            is_active=False,
            is_deleted=True,
            is_deleted_reason="Removed",
            is_deleted_by_email="admin@example.com",
            created_by=self.admin_user,
        )

        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            self.client.post(
                self.url,
                {"email": self.member_user.email, "role": "contributor"},
                format="json",
            )

        count = ProjectMember.objects.filter(
            project=self.project,
            membership=self.member_membership
        ).count()

        self.assertEqual(count, 1)

    def test_restore_keeps_same_member_id(self):
        """Restored member should keep original ID"""

        deleted_member = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.member_membership,
            role="contributor",
            status="inactive",
            is_active=False,
            is_deleted=True,
            is_deleted_reason="Removed",
            is_deleted_by_email="admin@example.com",
            created_by=self.admin_user,
        )

        original_id = deleted_member.id

        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            self.client.post(
                self.url,
                {"email": self.member_user.email, "role": "admin"},
                format="json",
            )

        deleted_member.refresh_from_db()

        self.assertEqual(deleted_member.id, original_id)