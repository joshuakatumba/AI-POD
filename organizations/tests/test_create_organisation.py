from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from organizations.models import Organization, Membership

User = get_user_model()


class CreateOrganisationAPITests(APITestCase):

    def setUp(self):
        # ---------- USERS ----------
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123"
        )

        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123"
        )

        # ---------- EXISTING ORG + MEMBERSHIP (member_user is a member somewhere) ----------
        self.existing_org = Organization.objects.create(
            name="Existing Org",
            country="Uganda",
            created_by=self.admin_user,
        )

        Membership.objects.create(
            user=self.member_user,
            organization=self.existing_org,
            role="member",
            created_by=self.admin_user,
            is_active=True,
        )

        # ---------- URL ----------
        self.create_org_url = reverse("organisations:create")

    # ---------- AUTH HELPER ----------
    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}"
        )
        return refresh

    # ---------- CREATE ORGANISATION ----------

    def test_create_organisation_success(self):
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "SheWolf Media",
            "country": "Uganda",
            "email": "info@shewolfmedia.com",
            "description": "Digital security and media organisation",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(
            Organization.objects.filter(name="SheWolf Media").exists()
        )

        organisation = Organization.objects.get(name="SheWolf Media")

        # creator should automatically become admin
        self.assertTrue(
            Membership.objects.filter(
                organization=organisation,
                user=self.admin_user,
                role="admin",
                is_active=True,
            ).exists()
        )

    def test_create_organisation_denied_for_member(self):
        """
        A user who is already a member in an organisation
        should not be allowed to create a new organisation.
        """
        self.authenticate(self.member_user)

        response = self.client.post(self.create_org_url, {
            "name": "Blocked Org",
            "country": "Uganda",
        })

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_organisation_unauthenticated(self):
        response = self.client.post(self.create_org_url, {
            "name": "No Auth Org",
            "country": "Uganda",
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_organisation_slug_is_generated(self):
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "My Cool Organisation",
            "country": "Uganda",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        organisation = Organization.objects.get(name="My Cool Organisation")

        self.assertIsNotNone(organisation.slug)
        self.assertTrue(organisation.slug.startswith("my-cool-organisation"))
