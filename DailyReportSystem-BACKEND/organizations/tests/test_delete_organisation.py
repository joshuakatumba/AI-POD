from rest_framework.test import APITestCase
from django.utils import timezone
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership
import uuid

User = get_user_model()

class TestDeleteOrganization(APITestCase):
    def setUp(self):
        # Admin user
        self.admin_user = User.objects.create_user(
            email="admin@example.com", 
            password="password123"
        )
        self.client.force_authenticate(self.admin_user)

        # Organization to delete
        self.org = Organization.objects.create(
            name="Org1",
            type="company",
            description="Test organization",
            email="org1@example.com",
            country="US",
            created_by=self.admin_user,
            is_active=True,
            is_deleted=False
        )

        # Admin membership
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role="admin",
            created_by=self.admin_user,
            is_active=True,
            is_deleted=False
        )
        
        # Additional members
        self.member1 = User.objects.create_user(
            email="member1@example.com", 
            password="pass123"
        )
        self.membership1 = Membership.objects.create(
            user=self.member1,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
            is_active=True,
            is_deleted=False
        )
        
        self.member2 = User.objects.create_user(
            email="member2@example.com", 
            password="pass123"
        )
        self.membership2 = Membership.objects.create(
            user=self.member2,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
            is_active=True,
            is_deleted=False
        )
        
        # Store base URL pattern
        self.delete_url = reverse("organizations:organisation", args=[self.org.id])

    def test_delete_organization_success(self):
        """Test successfully deleting an organization"""
        response = self.client.delete(self.delete_url, {})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "organization.delete_success")
        self.assertEqual(response.data["organization_id"], str(self.org.id))
        self.assertEqual(response.data["organization_name"], self.org.name)
        self.assertEqual(response.data["deleted_by"], self.admin_user.email)
        self.assertIsNotNone(response.data["is_deleted_at"])

        # Refresh and check soft delete for organization
        self.org.refresh_from_db()
        self.assertFalse(self.org.is_active)
        self.assertTrue(self.org.is_deleted)
        self.assertIsNotNone(self.org.is_deleted_at)
        
        # Check memberships were soft deleted
        memberships = Membership.objects.filter(organization=self.org)
        for membership in memberships:
            membership.refresh_from_db()
            self.assertTrue(membership.is_deleted)
            self.assertFalse(membership.is_active)
            self.assertIsNotNone(membership.is_deleted_at)

    def test_delete_organization_with_deletion_reason(self):
        """Test deleting an organization with a deletion reason"""
        deletion_reason = "Organization is no longer needed"
        response = self.client.delete(self.delete_url, {"deletion_reason": deletion_reason})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh and check deletion reason for organization
        self.org.refresh_from_db()
        
        # Check if organization has is_deleted_reason field
        if hasattr(self.org, 'is_deleted_reason'):
            self.assertEqual(self.org.is_deleted_reason, deletion_reason)
        elif hasattr(self.org, 'deletion_reason'):
            self.assertEqual(self.org.deletion_reason, deletion_reason)
        
        # Check membership deletion reason
        self.membership1.refresh_from_db()
        self.assertIn(deletion_reason, self.membership1.is_deleted_reason)

    def test_delete_organization_not_found(self):
        """Test deleting non-existent organization"""
        non_existent_uuid = uuid.uuid4()
        url = reverse("organizations:organisation", args=[non_existent_uuid])
        response = self.client.delete(url, {})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_organization_permission_denied_member(self):
        """Test that a regular member cannot delete the organization"""
        # Authenticate as regular member
        self.client.force_authenticate(self.member1)
        
        response = self.client.delete(self.delete_url, {})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify organization still exists and is active
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_active)
        self.assertFalse(self.org.is_deleted)

    def test_delete_organization_permission_denied_non_admin(self):
        """Test that a user with no membership cannot delete the organization"""
        # Create a user with no membership
        non_member = User.objects.create_user(
            email="nonmember@example.com", 
            password="pass123"
        )
        self.client.force_authenticate(non_member)
        
        response = self.client.delete(self.delete_url, {})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify organization still exists
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_active)
        self.assertFalse(self.org.is_deleted)

    def test_delete_organization_already_deleted(self):
        """Test that trying to delete an already deleted organization returns 400"""
        # First delete the organization - this should succeed
        response = self.client.delete(self.delete_url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try to delete again - this should fail with 400
        response = self.client.delete(self.delete_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been deleted", str(response.data["message"]).lower())

    def test_delete_organization_unauthorized(self):
        """Test that unauthenticated user cannot delete organization"""
        self.client.force_authenticate(None)  # Log out
        
        response = self.client.delete(self.delete_url, {})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Verify organization still exists
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_active)
        self.assertFalse(self.org.is_deleted)

    def test_delete_organization_with_multiple_admins(self):
        """Test deleting organization when there are multiple admins"""
        # Create another admin
        second_admin = User.objects.create_user(
            email="admin2@example.com", 
            password="pass123"
        )
        second_admin_membership = Membership.objects.create(
            user=second_admin,
            organization=self.org,
            role="admin",
            created_by=self.admin_user,
            is_active=True,
            is_deleted=False
        )
        
        # Delete as first admin
        response = self.client.delete(self.delete_url, {})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that all memberships are soft deleted
        second_admin_membership.refresh_from_db()
        self.assertTrue(second_admin_membership.is_deleted)
        self.assertFalse(second_admin_membership.is_active)
        self.assertIsNotNone(second_admin_membership.is_deleted_at)

    def test_delete_organization_as_different_admin(self):
        """Test that a different admin can delete the organization"""
        # Create another admin
        second_admin = User.objects.create_user(
            email="admin2@example.com", 
            password="pass123"
        )
        second_admin_membership = Membership.objects.create(
            user=second_admin,
            organization=self.org,
            role="admin",
            created_by=self.admin_user,
            is_active=True,
            is_deleted=False
        )
        
        # Authenticate as second admin
        self.client.force_authenticate(second_admin)
        
        response = self.client.delete(self.delete_url, {})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["deleted_by"], second_admin.email)
        
        # Verify organization is deleted
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_deleted)
        self.assertFalse(self.org.is_active)

    def test_delete_organization_superuser(self):
        """Test that a superuser can delete any organization"""
        # Create a superuser
        superuser = User.objects.create_superuser(
            email="superuser@example.com",
            password="password123"
        )
        self.client.force_authenticate(superuser)
        
        response = self.client.delete(self.delete_url, {})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify organization is deleted
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_deleted)
        self.assertFalse(self.org.is_active)

    def test_delete_organization_response_structure(self):
        """Test that the response has the expected structure"""
        response = self.client.delete(self.delete_url, {})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check response keys
        expected_keys = {"message", "organization_id", "organization_name", 
                        "is_deleted_at", "deleted_by", "memberships_deleted"}
        self.assertEqual(set(response.data.keys()), expected_keys)

    def test_delete_organization_with_no_members(self):
        """Test deleting an organization with no members (just admin)"""
        # Create a new organization with only the admin
        new_org = Organization.objects.create(
            name="Empty Org",
            created_by=self.admin_user,
            is_active=True,
            is_deleted=False
        )
        
        admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=new_org,
            role="admin",
            created_by=self.admin_user,
            is_active=True,
            is_deleted=False
        )
        
        url = reverse("organizations:organisation", args=[new_org.id])
        response = self.client.delete(url, {})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify organization is deleted
        new_org.refresh_from_db()
        self.assertTrue(new_org.is_deleted)
        self.assertFalse(new_org.is_active)
        
        # Verify admin membership is deleted
        admin_membership.refresh_from_db()
        self.assertTrue(admin_membership.is_deleted)
        self.assertFalse(admin_membership.is_active)
        self.assertIsNotNone(admin_membership.is_deleted_at)

    def test_delete_organization_with_inactive_members(self):
        """Test deleting organization that has some inactive members"""
        # Create an inactive member
        inactive_user = User.objects.create_user(
            email="inactive@example.com", 
            password="pass123"
        )
        inactive_membership = Membership.objects.create(
            user=inactive_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
            is_active=False,
            is_deleted=True,
            is_deleted_at=timezone.now(),
            is_deleted_by_email=self.admin_user.email,
            is_deleted_reason="Previously removed"
        )
        
        response = self.client.delete(self.delete_url, {})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that organization is deleted
        self.org.refresh_from_db()
        self.assertTrue(self.org.is_deleted)
        self.assertFalse(self.org.is_active)
        
        # Check that inactive member remains deleted but might have updated timestamp/reason
        inactive_membership.refresh_from_db()
        self.assertTrue(inactive_membership.is_deleted)
        self.assertFalse(inactive_membership.is_active)
        self.assertIsNotNone(inactive_membership.is_deleted_at)
