import uuid

from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership
from projects.models import Project
from projectMembers.models import ProjectMember
from core.tests.utils import MockAuthMixin

User = get_user_model()


class TestUpdateProjectMember(MockAuthMixin, APITestCase):

    def setUp(self):
        # Admin user
        self.admin_user = User.objects.create_user(email="admin@example.com", password="password123")

        # Organisation
        self.org = Organization.objects.create(name="Test Org", created_by=self.admin_user)

        # Admin membership (org-level)
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role="admin",
            display_name="Admin User",
            created_by=self.admin_user,
        )

        # Regular member
        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123"
        )

        self.member_membership = Membership.objects.create(
            user=self.member_user,
            organization=self.org,
            role="member",
            display_name="Regular Member",
            created_by=self.admin_user,
        )

        # Project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.org,
            created_by=self.admin_user,
            owner=self.admin_membership,
        )

        # Admin must also be a ProjectMember with role="admin"
        self.admin_project_member = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.admin_membership,
            role="admin",
            status="active",
            created_by=self.admin_user,
        )

        # Project member to update
        self.project_member = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.member_membership,
            role="contributor",
            status="active",
            created_by=self.admin_user,
        )

        # Auth payload
        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id),
        }

        # URL
        self.url = reverse(
            "projectMembers:project-member-detail",
            kwargs={
                "project_id": self.project.id,
                "member_id": self.project_member.id
            }
        )

    def test_update_member_role_success(self):
        """Admin project member can update role"""
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.patch(
                self.url,
                {"role": "admin"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "admin")

        self.project_member.refresh_from_db()
        self.assertEqual(self.project_member.role, "admin")

    def test_update_member_status_success(self):
        """Admin project member can update status"""
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.patch(
                self.url,
                {"status": "inactive"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "inactive")

        self.project_member.refresh_from_db()
        self.assertEqual(self.project_member.status, "inactive")

    def test_update_member_role_and_status(self):
        """Admin can update both role and status"""
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.patch(
                self.url,
                {"role": "admin", "status": "pending"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "admin")
        self.assertEqual(response.data["status"], "pending")

    def test_update_member_invalid_role(self):
        """Invalid role should return 400"""
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.patch(
                self.url,
                {"role": "invalid_role"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_member_invalid_status(self):
        """Invalid status should return 400"""
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.patch(
                self.url,
                {"status": "invalid_status"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_member_unauthenticated(self):
        """Unauthenticated users cannot update"""
        response = self.client.patch(
            self.url,
            {"role": "admin"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_member_non_admin(self):
        """Non-admin project member cannot update"""
        regular_user = User.objects.create_user(
            email="regular@example.com",
            password="password123"
        )

        regular_membership = Membership.objects.create(
            user=regular_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
        )

        # Add as project member BUT not admin
        ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=regular_membership,
            role="contributor",
            status="active",
            created_by=self.admin_user,
        )

        self.client.force_authenticate(user=regular_user)

        auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(regular_membership.id),
        }

        with self.mock_auth(auth):
            response = self.client.patch(
                self.url,
                {"role": "admin"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_member_org_admin_but_not_project_admin(self):
        """Org admin without project admin role should be denied"""
        org_admin_user = User.objects.create_user(
            email="orgadmin@example.com",
            password="password123"
        )

        org_admin_membership = Membership.objects.create(
            user=org_admin_user,
            organization=self.org,
            role="admin",
            created_by=self.admin_user,
        )

        # Not added as ProjectMember admin

        self.client.force_authenticate(user=org_admin_user)

        auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(org_admin_membership.id),
        }

        with self.mock_auth(auth):
            response = self.client.patch(
                self.url,
                {"role": "admin"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_member_superuser(self):
        """Superuser bypasses permission"""
        superuser = User.objects.create_superuser(
            email="super@example.com",
            password="password123"
        )

        self.client.force_authenticate(user=superuser)

        with self.mock_auth(self.admin_auth):
            response = self.client.patch(
                self.url,
                {"role": "admin"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_member_not_found(self):
        """Updating non-existent member returns 404"""
        url = reverse(
            "projectMembers:project-member-detail",
            kwargs={
                "project_id": self.project.id,
                "member_id": uuid.uuid4()
            }
        )

        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.patch(
                url,
                {"role": "admin"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_member_response_structure(self):
        """Response contains expected fields"""
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.patch(
                self.url,
                {"role": "admin"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)
        self.assertIn("reference", response.data)
        self.assertIn("member_id", response.data)
        self.assertIn("member_name", response.data)
        self.assertIn("member_email", response.data)
        self.assertIn("role", response.data)
        self.assertIn("status", response.data)