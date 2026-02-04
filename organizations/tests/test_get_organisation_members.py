from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.timezone import now

User = get_user_model()


class TestGetOrganizationMembers(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="user@example.com",
            password="password123"
        )

        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="password123"
        )

        self.org1 = Organization.objects.create(
            name="Org One",
            slug="org-one",
            created_by=self.user
        )

        self.org2 = Organization.objects.create(
            name="Org Two",
            slug="org-two",
            created_by=self.user
        )

        self.membership1 = Membership.objects.create(
            user=self.user,
            organization=self.org1,
            role="admin",
            created_by=self.user,
            is_active=True,
            last_accessed_at=now()
        )

        self.membership2 = Membership.objects.create(
            user=self.other_user,
            organization=self.org1,
            role="member",
            created_by=self.user,
            is_active=True
        )

        self.membership3 = Membership.objects.create(
            user=self.user,
            organization=self.org2,
            role="member",
            created_by=self.user,
            is_active=True
        )

        self.url_org1 = reverse("organizations:organization-members", kwargs={
            "organization_id": self.org1.id
        })

        self.url_org2 = reverse("organizations:organization-members", kwargs={
            "organization_id": self.org2.id
        })

    def authenticate(self, user=None):
        user = user or self.user
        refresh = RefreshToken.for_user(user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}"
        )

    # ---------- GET ORGANIZATION MEMBERS ----------

    def test_get_organization_members_success(self):
        self.authenticate()

        response = self.client.get(self.url_org1)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        emails = [m["user_email"] for m in response.data]
        self.assertIn("user@example.com", emails)
        self.assertIn("other@example.com", emails)

    def test_get_organization_members_returns_only_that_org(self):
        self.authenticate()

        response = self.client.get(self.url_org2)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["organization_name"], "Org Two")

    def test_get_organization_members_unauthenticated(self):
        response = self.client.get(self.url_org1)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_organization_members_invalid_org(self):
        self.authenticate()

        fake_id = "11111111-1111-1111-1111-111111111111"

        url = reverse("organizations:organization-members", kwargs={
            "organization_id": fake_id
        })

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
