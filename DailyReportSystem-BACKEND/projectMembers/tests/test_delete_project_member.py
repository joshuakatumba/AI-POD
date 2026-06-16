from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership
from projects.models import Project
from projectMembers.models import ProjectMember
from core.tests.utils import MockAuthMixin
import uuid

User = get_user_model()


class TestDeleteProjectMember(MockAuthMixin, APITestCase):

    def setUp(self):
        # -----------------------
        # Admin user
        # -----------------------
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123"
        )

        self.org = Organization.objects.create(
            name="Test Org",
            created_by=self.admin_user
        )

        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role="admin",
            created_by=self.admin_user,
        )

        self.project = Project.objects.create(
            name="Test Project",
            organization=self.org,
            created_by=self.admin_user,
            owner=self.admin_membership,
        )

        # Admin must be project admin for permission to pass
        self.admin_project_member = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.admin_membership,
            role="admin",
            status="active",
            created_by=self.admin_user,
        )

        # -----------------------
        # Member to be deleted
        # -----------------------
        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123"
        )

        self.member_membership = Membership.objects.create(
            user=self.member_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
        )

        self.project_member = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.member_membership,
            role="contributor",
            status="active",
            created_by=self.admin_user,
        )

        # -----------------------
        # Auth payload
        # -----------------------
        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id),
        }

        # URL
        self.url = reverse(
            "projectMembers:project-member-detail",
            kwargs={
                "project_id": self.project.id,
                "member_id": self.project_member.id,
            }
        )

    # -----------------------
    # SUCCESS CASE
    # -----------------------
    def test_delete_member_success(self):
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    # -----------------------
    # AUTH FAILURES
    # -----------------------
    def test_delete_member_unauthenticated(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_member_permission_denied(self):
        """Non-admin project member cannot delete"""
        normal_user = User.objects.create_user(
            email="normal@example.com",
            password="password123"
        )

        normal_membership = Membership.objects.create(
            user=normal_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
        )

        # Not a project admin
        ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=normal_membership,
            role="contributor",
            status="active",
            created_by=self.admin_user,
        )

        self.client.force_authenticate(user=normal_user)

        with self.mock_auth({
            "organisation_id": str(self.org.id),
            "membership_id": str(normal_membership.id),
        }):
            response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # -----------------------
    # NOT FOUND
    # -----------------------
    def test_delete_member_not_found(self):
        self.client.force_authenticate(user=self.admin_user)

        url = reverse(
            "projectMembers:project-member-detail",
            kwargs={
                "project_id": self.project.id,
                "member_id": uuid.uuid4(),
            }
        )

        with self.mock_auth(self.admin_auth):
            response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # -----------------------
    # SOFT DELETE CHECK
    # -----------------------
    def test_delete_verifies_soft_delete(self):
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            self.client.delete(self.url)

        self.project_member.refresh_from_db()

        self.assertTrue(self.project_member.is_deleted)
        self.assertFalse(self.project_member.is_active)
        self.assertEqual(self.project_member.status, "inactive")