from django.urls import reverse
from django.contrib.auth import get_user_model

from core.tests.utils import MockAuthMixin
from projects.models import Project
from rest_framework import status
from rest_framework.test import APITestCase
from organizations.models import Organization, Membership
from uuid import uuid4

User = get_user_model()

class TestCreateProject(MockAuthMixin, APITestCase):
    def setUp(self):
        # 1. Setup Users
        self.admin_user = User.objects.create_user(email="admin@example.com", password="pass")
        self.member_user = User.objects.create_user(email="member@example.com", password="pass")
        self.random_user = User.objects.create_user(email="stranger@example.com", password="pass")
        self.superuser = User.objects.create_superuser(email="root@example.com", password="pass")

        # 2. Setup Organization
        self.org = Organization.objects.create(name="Tech Corp", created_by=self.admin_user)

        # 3. Setup Memberships
        self.admin_membership = Membership.objects.create(
            user=self.admin_user, organization=self.org, role="admin", created_by=self.admin_user
        )
        self.normal_membership = Membership.objects.create(
            user=self.member_user, organization=self.org, role="member", created_by=self.admin_user
        )

        self.url = reverse("projects:projects")
        self.valid_data = {"name": "Alpha Project", "description": "High priority"}

        # Payloads
        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id)
        }
        self.member_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.normal_membership.id)
        }

    # --- PERMISSION TESTS ---

    def test_create_success_as_admin(self):
        """Standard Admin flow: Should succeed."""
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.post(self.url, self.valid_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.count(), 1)
        # Verify serializer logic: check if owner was set correctly from membership_id
        self.assertEqual(response.data['owner_id'], str(self.admin_membership.id))

    def test_create_forbidden_as_member(self):
        """Member role flow: Permission class should return False."""
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            response = self.client.post(self.url, self.valid_data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("You must be an admin", response.data['detail'])

    def test_create_failure_as_superuser(self):
        """Superuser flow: Should bypass role check but still use token for IDs."""
        self.client.force_authenticate(self.superuser)
        with self.mock_auth(self.admin_auth):
            response = self.client.post(self.url, self.valid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["membership"][0], "Invalid membership.")

    # --- TOKEN INTEGRITY TESTS ---

    def test_fail_missing_org_id_in_token(self):
        """Permission class should fail if organisation_id is missing in request.auth."""
        self.client.force_authenticate(self.admin_user)
        # Token missing organisation_id
        with self.mock_auth({"membership_id": str(self.admin_membership.id)}):
            response = self.client.post(self.url, self.valid_data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_fail_invalid_org_uuid(self):
        """Serializer should fail if organisation_id in token doesn't exist in DB."""
        self.client.force_authenticate(self.admin_user)
        random_uuid = str(uuid4())
        with self.mock_auth({"organisation_id": random_uuid, "membership_id": str(self.admin_membership.id)}):
            response = self.client.post(self.url, self.valid_data)

        print("GRAGO: ", response.data)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("detail", response.data)
        self.assertEqual(response.data["detail"], "You must be an admin of this organization to create projects.")


    def test_fail_invalid_membership_uuid(self):
        """Serializer should fail if membership_id in token doesn't exist in DB."""
        self.client.force_authenticate(self.admin_user)
        random_uuid = str(uuid4())
        with self.mock_auth({"organisation_id": str(self.org.id), "membership_id": random_uuid}):
            response = self.client.post(self.url, self.valid_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("membership", response.data)
        self.assertEqual(response.data["membership"][0], "Invalid membership.")

    # --- DATA VALIDATION TESTS ---

    def test_create_fail_invalid_body(self):
        """Standard serializer validation: Missing project name."""
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.post(self.url, {"description": "No Name"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)
        self.assertEqual(response.data["name"][0], "This field is required.")