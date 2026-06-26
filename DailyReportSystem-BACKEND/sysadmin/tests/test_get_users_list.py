from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import MockAuthMixin
from organizations.models import Organization, Membership

User = get_user_model()


class TestSysAdminGetUsers(MockAuthMixin, APITestCase):

    def setUp(self):
        # 1. Users
        self.superuser = User.objects.create_superuser(
            email="root@example.com",
            password="pass"
        )

        self.normal_user = User.objects.create_user(
            email="user@example.com",
            password="pass"
        )

        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="pass"
        )

        # 2. Organizations
        self.org = Organization.objects.create(
            name="Tech Corp",
            created_by=self.superuser
        )

        self.other_org = Organization.objects.create(
            name="Other Corp",
            created_by=self.superuser
        )

        # 3. Memberships
        self.membership_1 = Membership.objects.create(
            user=self.normal_user,
            organization=self.org,
            role="member",
            created_by=self.superuser,
        )

        self.membership_2 = Membership.objects.create(
            user=self.normal_user,
            organization=self.other_org,
            role="admin",
            created_by=self.superuser,
        )

        self.membership_3 = Membership.objects.create(
            user=self.other_user,
            organization=self.org,
            role="member",
            created_by=self.superuser,
        )

        self.url = reverse("sysadmin:users")

    # -------------------
    # Helpers
    # -------------------

    def get_users(self, user=None):
        """Helper to perform GET request."""
        if user:
            self.client.force_authenticate(user)
            return self.client.get(self.url)
        return self.client.get(self.url)

    # -------------------
    # Tests
    # -------------------

    def test_list_users_superadmin(self):
        """Super admin should retrieve users list."""
        response = self.get_users(self.superuser)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 3)

    def test_list_users_includes_expected_fields(self):
        """Response should include expected user fields."""
        response = self.get_users(self.superuser)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user_data = response.data[0]

        self.assertIn("id", user_data)
        self.assertIn("email", user_data)
        self.assertIn("is_active", user_data)
        self.assertIn("is_staff", user_data)
        self.assertIn("is_superuser", user_data)
        self.assertIn("last_login", user_data)
        self.assertIn("date_joined", user_data)
        self.assertIn("memberships", user_data)

    def test_list_users_includes_organizations(self):
        """Organizations should be returned for users."""
        response = self.get_users(self.superuser)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user = next(
            u for u in response.data if u["email"] == self.normal_user.email
        )

        self.assertEqual(len(user["memberships"]), 2)

        org_names = [o["organization_name"] for o in user["memberships"]]

        self.assertIn(self.org.name, org_names)
        self.assertIn(self.other_org.name, org_names)

    def test_list_users_membership_fields(self):
        """Membership fields should appear in organizations list."""
        response = self.get_users(self.superuser)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user = next(
            u for u in response.data if u["email"] == self.normal_user.email
        )

        org = user["memberships"][0]

        self.assertIn("id", org)
        self.assertIn("organization_id", org)
        self.assertIn("organization_name", org)
        self.assertIn("display_name", org)
        self.assertIn("role", org)
        self.assertIn("joined_at", org)
        self.assertIn("last_accessed_at", org)

    def test_list_users_unauthenticated(self):
        """Unauthenticated requests should return 401."""
        response = self.get_users()

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_users_non_superadmin_forbidden(self):
        """Non-superadmins should not access endpoint."""
        response = self.get_users(self.normal_user)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_without_memberships(self):
        """Users without memberships should return empty organizations list."""
        user = User.objects.create_user(
            email="nomembership@example.com",
            password="pass"
        )

        response = self.get_users(self.superuser)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user_data = next(
            u for u in response.data if u["email"] == user.email
        )

        self.assertEqual(user_data["memberships"], [])

    def test_user_list_excludes_inactive_memberships(self):
        inactive_org = Organization.objects.create(
            name="Inactive Org",
            created_by=self.superuser
        )
        Membership.objects.create(
            user=self.normal_user,
            organization=inactive_org,
            role="member",
            is_active=False,
            created_by=self.superuser,
        )
        response = self.get_users(self.superuser)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_data = next(u for u in response.data if u["email"] == self.normal_user.email)
        self.assertEqual(len(user_data["memberships"]), 2)
        org_names = [m["organization_name"] for m in user_data["memberships"]]
        self.assertNotIn("Inactive Org", org_names)