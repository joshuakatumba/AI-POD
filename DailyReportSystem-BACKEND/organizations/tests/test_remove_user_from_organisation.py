from rest_framework.test import APITestCase
from django.utils import timezone
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership
import uuid

User = get_user_model()

class TestRemoveUserFromOrganisation(APITestCase):
    def setUp(self):
        # Admin user
        self.admin_user = User.objects.create_user(
            email="admin@example.com", 
            password="password123"
        )
        self.client.force_authenticate(self.admin_user)

        # Shared organization
        self.org = Organization.objects.create(
            name="Org1", 
            created_by=self.admin_user
        )

        # Admin membership
        self.admin_membership = Membership.objects.create(
            user=self.admin_user, 
            organization=self.org, 
            role="admin", 
            created_by=self.admin_user
        )
        
        # Store base URL pattern
        self.base_url = "organizations:member"

    # Helper method to build URL
    def _get_member_url(self, membership_id):
        return reverse(self.base_url, args=[self.org.id, membership_id])

    # ---------- REMOVE MEMBER ----------
    def test_remove_member_success(self):
        """Test successfully removing a member"""
        member_user = User.objects.create_user(
            email="member3@example.com", 
            password="pass123"
        )
        membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        # Use the correct URL with membership_id
        url = self._get_member_url(membership.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("has been removed", response.data["message"])

        # Refresh and check soft delete
        membership.refresh_from_db()
        self.assertFalse(membership.is_active)
        self.assertTrue(membership.is_deleted)
        self.assertIsNotNone(membership.is_deleted_at)
        self.assertEqual(membership.is_deleted_by_email, self.admin_user.email)
        self.assertEqual(membership.is_deleted_reason, "Removed by admin")

    def test_remove_member_not_found(self):
        """Test removing non-existent membership"""
        non_existent_uuid = uuid.uuid4()
        url = reverse(self.base_url, args=[self.org.id, non_existent_uuid])
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_remove_member_permission_denied(self):
        """Test non-admin cannot remove members"""
        # Create a normal (non-admin) user
        normal_user = User.objects.create_user(
            email="normal2@example.com", 
            password="password123"
        )
        Membership.objects.create(
            user=normal_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )
        
        # Create another member to try to remove
        member_user = User.objects.create_user(
            email="member4@example.com", 
            password="pass123"
        )
        target_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        # Authenticate as normal user
        self.client.force_authenticate(normal_user)
        
        # Try to remove another member
        url = self._get_member_url(target_membership.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("permission", str(response.data).lower())
        
        # Verify the membership still exists and is active
        target_membership.refresh_from_db()
        self.assertTrue(target_membership.is_active)
        self.assertFalse(target_membership.is_deleted)
        self.assertIsNone(target_membership.is_deleted_at)
        self.assertEqual(target_membership.is_deleted_by_email, "")

    def test_cannot_remove_self(self):
        """Test that users cannot remove themselves"""
        # First, create another admin so we're not the last admin
        second_admin = User.objects.create_user(
            email="admin2@example.com", 
            password="pass123"
        )
        Membership.objects.create(
            user=second_admin, 
            organization=self.org, 
            role="admin", 
            created_by=self.admin_user
        )
        
        # Now try to remove ourselves 
        url = self._get_member_url(self.admin_membership.id)
        response = self.client.delete(url)
        
        # Should fail - cannot remove yourself
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Check for "yourself" in the error message
        error_message = str(response.data).lower()
        self.assertIn("yourself", error_message, 
                     f"Expected 'yourself' in error message but got: {error_message}")
        
        # Verify admin membership still exists and is active
        self.admin_membership.refresh_from_db()
        self.assertTrue(self.admin_membership.is_active)
        self.assertFalse(self.admin_membership.is_deleted)
        self.assertIsNone(self.admin_membership.is_deleted_at)

    def test_remove_inactive_member_returns_404(self):
        """Test that trying to remove already deleted member returns 404"""
        member_user = User.objects.create_user(
            email="inactive@example.com", 
            password="pass123"
        )
        membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user,
            is_active=False,
            is_deleted=True,
            is_deleted_at=timezone.now(),
            is_deleted_by_email=self.admin_user.email
        )

        # Try to remove already deleted member
        url = self._get_member_url(membership.id)
        response = self.client.delete(url)

        # Should return 404 because membership is not active
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

