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

        # Admin membership
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role="admin",
            display_name="Admin User",
            created_by=self.admin_user,
        )

        # Regular member
        self.member_user = User.objects.create_user(email="member@example.com", password="password123")
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
            kwargs={"project_id": self.project.id, "member_id": self.project_member.id}
        )

    def test_update_member_role_success(self):
        """Test successfully updating a member's role"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.patch(self.url, {"role": "admin"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "admin")  # Role should not change to product_owner

        # Verify in database
        self.project_member.refresh_from_db()
        self.assertEqual(self.project_member.role, "admin")

    def test_update_member_status_success(self):
        """Test successfully updating a member's status"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.patch(self.url, {"status": "inactive"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "inactive")

        # Verify in database
        self.project_member.refresh_from_db()
        self.assertEqual(self.project_member.status, "inactive")

    def test_update_member_role_and_status(self):
        """Test updating both role and status simultaneously"""
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
        """Test that invalid role is rejected"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.patch(self.url, {"role": "invalid_role"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_member_invalid_status(self):
        """Test that invalid status is rejected"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.patch(self.url, {"status": "invalid_status"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_member_unauthenticated(self):
        """Test that unauthenticated users cannot update members"""
        response = self.client.patch(self.url, {"role": "admin"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_member_non_admin(self):
        """Test that non-admin org members cannot update members"""
        regular_user = User.objects.create_user(email="regular@example.com", password="password123")
        regular_membership = Membership.objects.create(
            user=regular_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
        )

        self.client.force_authenticate(user=regular_user)
        regular_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(regular_membership.id),
        }
        with self.mock_auth(regular_auth):
            response = self.client.patch(self.url, {"role": "admin"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_member_not_found(self):
        """Test updating a non-existent member returns 404"""
        import uuid
        url = reverse(
            "projectMembers:project-member-detail",
            kwargs={"project_id": self.project.id, "member_id": uuid.uuid4()}
        )

        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.patch(url, {"role": "admin"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_member_response_structure(self):
        """Test that response contains all expected fields"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.patch(self.url, {"role": "admin"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("id", response.data)
        self.assertIn("reference", response.data)
        self.assertIn("member_id", response.data)
        self.assertIn("member_name", response.data)
        self.assertIn("member_email", response.data)
        self.assertIn("role", response.data)
        self.assertIn("status", response.data)
