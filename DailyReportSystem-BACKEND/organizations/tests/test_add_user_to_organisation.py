from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership

User = get_user_model()

class TestAddUserToOrganisation(APITestCase):
    def setUp(self):
         # Admin user
        self.admin_user = User.objects.create_user(email="admin@example.com", password="password123", full_name="Admin User", preferred_language="en")
        self.client.force_authenticate(self.admin_user)

        # Shared organization
        self.org = Organization.objects.create(name="Org1", created_by=self.admin_user)

        # Admin membership
        Membership.objects.create(user=self.admin_user, organization=self.org, role="admin", created_by=self.admin_user)

        # URL for add
        self.url_members = reverse("organizations:members", args=[self.org.id])

    # ---------- ADD MEMBER ----------
    def test_add_member_success(self):
        member_user = User.objects.create_user(email="member@example.com", password="password123", full_name="Member User", preferred_language="en")
        payload = {"email": member_user.email}
        response = self.client.post(self.url_members, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], "member")

        self.assertEqual(response.data["display_name"], member_user.full_name)
        self.assertEqual(response.data["preferred_language"], member_user.preferred_language)

    def test_add_member_with_role_admin_success(self):
        member_user = User.objects.create_user(email="member@example.com", password="password123", full_name="Member User", preferred_language="en")
        payload = {"email": member_user.email, "role": "admin"}
        response = self.client.post(self.url_members, payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], "admin")

        self.assertEqual(response.data["display_name"], member_user.full_name)
        self.assertEqual(response.data["preferred_language"], member_user.preferred_language)

    def test_add_member_user_not_found(self):
        payload = {"email": "nonexistent@example.com"}
        response = self.client.post(self.url_members, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not exist", str(response.data))

    def test_add_member_duplicate(self):
        user = User.objects.create_user(email="dup@example.com", password="pass123", full_name="Duplicate User", preferred_language="en")
        Membership.objects.create(user=user, organization=self.org, role="member", created_by=self.admin_user)
        payload = {"email": user.email}

        response = self.client.post(self.url_members, payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already a member", str(response.data))

    def test_add_member_permission_denied(self):
        normal_user = User.objects.create_user(email="normal@example.com", password="password123", full_name="Normal User", preferred_language="en")
        Membership.objects.create(user=normal_user, organization=self.org, role="member", created_by=self.admin_user)
        self.client.force_authenticate(normal_user)

        member_user = User.objects.create_user(email="member2@example.com", password="password123", full_name="Member User", preferred_language="en")
        payload = {"email": member_user.email}

        response = self.client.post(self.url_members, payload)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("permission", str(response.data).lower())
