from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
from organizations.models import Organization, Membership

User = get_user_model()


class AdminUpdateOrganisationAPITests(APITestCase):

    def setUp(self):
        User.objects.all().delete()
        Organization.objects.all().delete()
        Membership.objects.all().delete()

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

        self.org = Organization.objects.create(
            name="Groundbreaker Talents",
            country="Uganda",
            email="org@example.com",
            description="Original description",
            created_by=self.admin_user,
        )

        self.url = lambda org_id: reverse("sysadmin:admin-organisation", args=[str(org_id)])

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def test_admin_can_update_organisation_name(self):
        """Superuser should be able to update organisation name."""
        self.authenticate(self.admin_user)
        response = self.client.patch(self.url(self.org.id), {"name": "New Name"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.org.refresh_from_db()
        self.assertEqual(self.org.name, "New Name")

    def test_admin_can_update_organisation_email(self):
        """Superuser should be able to update organisation email."""
        self.authenticate(self.admin_user)
        response = self.client.patch(self.url(self.org.id), {"email": "new@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.org.refresh_from_db()
        self.assertEqual(self.org.email, "new@example.com")

    def test_admin_can_update_organisation_country(self):
        """Superuser should be able to update organisation country."""
        self.authenticate(self.admin_user)
        response = self.client.patch(self.url(self.org.id), {"country": "Kenya"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.org.refresh_from_db()
        self.assertEqual(self.org.country, "Kenya")

    def test_admin_can_update_organisation_description(self):
        """Superuser should be able to update organisation description."""
        self.authenticate(self.admin_user)
        response = self.client.patch(self.url(self.org.id), {"description": "Updated description"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.org.refresh_from_db()
        self.assertEqual(self.org.description, "Updated description")

    def test_admin_can_deactivate_organisation(self):
        """Superuser should be able to deactivate an organisation."""
        self.authenticate(self.admin_user)
        response = self.client.patch(self.url(self.org.id), {"is_active": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.org.refresh_from_db()
        self.assertFalse(self.org.is_active)

    def test_admin_can_update_multiple_fields_at_once(self):
        """Superuser should be able to update multiple fields in one request."""
        self.authenticate(self.admin_user)
        payload = {
            "name": "Updated Org",
            "country": "Tanzania",
            "email": "updated@example.com",
        }
        response = self.client.patch(self.url(self.org.id), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.org.refresh_from_db()
        self.assertEqual(self.org.name, "Updated Org")
        self.assertEqual(self.org.country, "Tanzania")
        self.assertEqual(self.org.email, "updated@example.com")

    def test_response_contains_expected_fields(self):
        """Response should include all expected fields after update."""
        self.authenticate(self.admin_user)
        response = self.client.patch(self.url(self.org.id), {"name": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in ["id", "name", "email", "country", "description", "is_active"]:
            self.assertIn(field, response.data)

    def test_non_superuser_cannot_update_organisation(self):
        """Non-superuser should be denied access."""
        self.authenticate(self.member_user)
        response = self.client.patch(self.url(self.org.id), {"name": "Hacked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.org.refresh_from_db()
        self.assertEqual(self.org.name, "Groundbreaker Talents")

    def test_unauthenticated_user_cannot_update_organisation(self):
        """Unauthenticated request should be rejected."""
        response = self.client.patch(self.url(self.org.id), {"name": "Hacked"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_nonexistent_organisation_returns_404(self):
        """Updating a non-existent organisation should return 404."""
        self.authenticate(self.admin_user)
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = self.client.patch(self.url(fake_id), {"name": "Ghost Org"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)