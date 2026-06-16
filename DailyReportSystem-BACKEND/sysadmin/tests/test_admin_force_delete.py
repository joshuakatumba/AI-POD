from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken

from organizations.models import Organization, Membership

User = get_user_model()


class AdminForceDeleteOrganisationAPITests(APITestCase):

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
        self.org = Organization.objects.create(
            name="Groundbreaker Talents",
            country="Uganda",
            created_by=self.admin_user,
        )

        self.already_deleted_org = Organization.objects.create(
            name="Already Deleted Org",
            country="Uganda",
            created_by=self.admin_user,
            is_deleted=True,
        )

        # ---------- MEMBERSHIPS ----------
        Membership.objects.create(
            user=self.member_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
            is_active=True,
        )

    # ---------- AUTH HELPER ----------
    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def get_url(self, organization_id):
        return reverse("sysadmin:admin-organisation", kwargs={"organization_id": organization_id})

    # ---------- TESTS ----------

    def test_admin_can_force_delete_organisation(self):
        """Superuser can force delete an organisation they don't belong to"""
        self.authenticate(self.admin_user)
        response = self.client.delete(self.get_url(self.org.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["organization_id"], str(self.org.id))
        self.assertEqual(response.data["organization_name"], self.org.name)
        self.assertEqual(response.data["deleted_by"], self.admin_user.email)
        self.assertIn("is_deleted_at", response.data)

    def test_organisation_is_soft_deleted_after_force_delete(self):
        """Organisation should be marked as deleted in the database"""
        self.authenticate(self.admin_user)
        self.client.delete(self.get_url(self.org.id))
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_deleted)
        self.assertFalse(self.org.is_active)
        self.assertIsNotNone(self.org.is_deleted_at)

    def test_memberships_are_soft_deleted_after_force_delete(self):
        """All memberships in the org should be soft deleted"""
        self.authenticate(self.admin_user)
        self.client.delete(self.get_url(self.org.id))
        active_memberships = Membership.objects.filter(
            organization=self.org,
            is_deleted=False,
        )
        self.assertEqual(active_memberships.count(), 0)

    def test_admin_can_force_delete_with_deletion_reason(self):
        """Superuser can provide an optional deletion reason"""
        self.authenticate(self.admin_user)
        response = self.client.delete(
            self.get_url(self.org.id),
            data={"deletion_reason": "Violating terms of service"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_force_delete_without_deletion_reason(self):
        """deletion_reason is optional — request should succeed without it"""
        self.authenticate(self.admin_user)
        response = self.client.delete(self.get_url(self.org.id), data={}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_force_delete_already_deleted_organisation(self):
        """Force deleting an already deleted org should return 400"""
        self.authenticate(self.admin_user)
        response = self.client.delete(self.get_url(self.already_deleted_org.id))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("message", response.data)

    def test_force_delete_nonexistent_organisation_returns_404(self):
        """Deleting an org that doesn't exist should return 404"""
        self.authenticate(self.admin_user)
        import uuid
        response = self.client.delete(self.get_url(uuid.uuid4()))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_member_user_cannot_force_delete_organisation(self):
        """Non-superuser should be denied access"""
        self.authenticate(self.member_user)
        response = self.client.delete(self.get_url(self.org.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_with_no_membership_cannot_force_delete_organisation(self):
        """Authenticated non-superuser with no membership should be denied"""
        self.authenticate(self.no_membership_user)
        response = self.client.delete(self.get_url(self.org.id))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_force_delete_organisation(self):
        """Unauthenticated request should be rejected"""
        response = self.client.delete(self.get_url(self.org.id))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_delete_org_they_dont_belong_to(self):
        """Superuser should be able to delete an org they have no membership in"""
        org_without_admin = Organization.objects.create(
            name="Org Without Admin",
            country="Uganda",
            created_by=self.member_user,
        )
        self.authenticate(self.admin_user)
        response = self.client.delete(self.get_url(org_without_admin.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_response_contains_expected_fields(self):
        """Response should include all expected fields"""
        self.authenticate(self.admin_user)
        response = self.client.delete(self.get_url(self.org.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in ["message", "organization_id", "organization_name", "deleted_by", "is_deleted_at"]:
            self.assertIn(field, response.data)