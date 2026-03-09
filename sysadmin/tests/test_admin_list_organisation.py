from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from organizations.models import Organization, Membership

User = get_user_model()


class AdminListOrganisationsAPITests(APITestCase):

    def setUp(self):
        User.objects.all().delete()
        Organization.objects.all().delete()
        Membership.objects.all().delete()

        # ---------- USERS ----------
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123",
        )
        self.admin_user.is_superuser = True
        self.admin_user.save()

        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123",
        )

        self.no_membership_user = User.objects.create_user(
            email="nomembership@example.com",
            password="password123",
        )

        # ---------- ORGANISATIONS ----------
        self.org1 = Organization.objects.create(
            name="Groundbreaker Talents",
            country="Uganda",
            created_by=self.admin_user,
        )

        self.org2 = Organization.objects.create(
            name="RHU",
            country="Uganda",
            created_by=self.admin_user,
        )

        # ---------- MEMBERSHIPS ----------
        Membership.objects.create(
            user=self.admin_user,
            organization=self.org1,
            role="admin",
            created_by=self.admin_user,
            is_active=True,
        )

        Membership.objects.create(
            user=self.member_user,
            organization=self.org1,
            role="member",
            created_by=self.admin_user,
            is_active=True,
        )

        # ---------- URL ----------
        self.url = reverse("sysadmin:organizations")

    # ---------- AUTH HELPER ----------
    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    # ---------- TESTS ----------

    def test_admin_can_list_all_organisations(self):
        """Superuser should see all organisations"""
        self.authenticate(self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        org_names = [org["name"] for org in response.data]
        self.assertIn("Groundbreaker Talents", org_names)
        self.assertIn("RHU", org_names)

    def test_response_contains_expected_fields(self):
        """Response should include all expected fields including member_count"""
        self.authenticate(self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        org = response.data[0]
        for field in [
            "id", "reference", "name", "slug", "type", "description",
            "email", "country", "member_count", "is_active", "is_deleted",
            "created_at", "modified_at",
        ]:
            self.assertIn(field, org)

    def test_member_count_is_correct(self):
        """member_count should reflect actual number of memberships per org"""
        self.authenticate(self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        org1_data = next(o for o in response.data if o["name"] == "Groundbreaker Talents")
        org2_data = next(o for o in response.data if o["name"] == "RHU")
        self.assertEqual(org1_data["member_count"], 2)
        self.assertEqual(org2_data["member_count"], 0)

    def test_member_user_cannot_list_organisations(self):
        """Non-superuser should be denied access"""
        self.authenticate(self.member_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_with_no_membership_cannot_list_organisations(self):
        """Authenticated non-superuser with no membership should be denied"""
        self.authenticate(self.no_membership_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_list_organisations(self):
        """Unauthenticated request should be rejected"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_sees_orgs_they_dont_belong_to(self):
        """Superuser should see org2 even though they have no membership in it"""
        self.authenticate(self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        org_names = [org["name"] for org in response.data]
        self.assertIn("RHU", org_names)

    def test_results_ordered_by_newest_first(self):
        """Organisations should be returned newest first"""
        self.authenticate(self.admin_user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["name"], "RHU")
        self.assertEqual(response.data[1]["name"], "Groundbreaker Talents")