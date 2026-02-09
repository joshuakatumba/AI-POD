from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership
import uuid

User = get_user_model()

class TestUpdateMemberRoleAndName(APITestCase):
    def setUp(self):
        # Admin user
        self.admin_user = User.objects.create_user(
            email="admin@example.com", 
            password="password123"
        )
        self.client.force_authenticate(self.admin_user)

        # Shared organization
        self.org = Organization.objects.create(
            name="Test Org", 
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
    
    # Helper method to create superuser
    def _create_superuser(self, email, password):
        """Helper to create a superuser"""
        user = User.objects.create_user(email=email, password=password)
        user.is_superuser = True
        user.is_staff = True
        user.save()
        return user

    # ---------- ROLE CHANGE TESTS (Admins/Superusers only) ----------
    def test_promote_member_to_admin_success(self):
        """Test successfully promoting a member to admin (admin can do this)"""
        # Create a regular member
        member_user = User.objects.create_user(
            email="member@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        url = self._get_member_url(member_membership.id)
        payload = {"role": "admin"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("role updated to 'admin' successfully", response.data["message"])
        self.assertEqual(response.data["data"]["role"], "admin")
        
        # Verify the change in database
        member_membership.refresh_from_db()
        self.assertEqual(member_membership.role, "admin")

    def test_demote_admin_to_member_when_multiple_admins_exist(self):
        """Test successfully demoting an admin to member when there are other admins"""
        # Create a second admin
        admin2 = User.objects.create_user(
            email="admin2@example.com", 
            password="pass123"
        )
        admin2_membership = Membership.objects.create(
            user=admin2, 
            organization=self.org, 
            role="admin", 
            created_by=self.admin_user
        )

        # Now we have 2 admins: admin_user and admin2
        # Demote admin2 to member
        url = self._get_member_url(admin2_membership.id)
        payload = {"role": "member"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("role updated to 'member' successfully", response.data["message"])
        self.assertEqual(response.data["data"]["role"], "member")
        
        # Verify the change
        admin2_membership.refresh_from_db()
        self.assertEqual(admin2_membership.role, "member")
        
        # Verify original admin still exists as admin
        self.admin_membership.refresh_from_db()
        self.assertEqual(self.admin_membership.role, "admin")

    def test_superuser_can_change_roles(self):
        """Test that a superuser can change roles"""
        # Create a superuser
        superuser = self._create_superuser("super@example.com", "pass123")
        
        # Create a member
        member_user = User.objects.create_user(
            email="member2@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        # Authenticate as superuser
        self.client.force_authenticate(superuser)
        
        # Promote member to admin
        url = self._get_member_url(member_membership.id)
        payload = {"role": "admin"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["role"], "admin")
        
        # Verify the change
        member_membership.refresh_from_db()
        self.assertEqual(member_membership.role, "admin")

    def test_non_admin_cannot_change_roles(self):
        """Test that a non-admin member cannot change roles"""
        # Create a regular member (non-admin)
        regular_user = User.objects.create_user(
            email="regular@example.com", 
            password="pass123"
        )
        
        # Create another member to try to promote
        target_user = User.objects.create_user(
            email="target@example.com", 
            password="pass123"
        )
        target_membership = Membership.objects.create(
            user=target_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        # Authenticate as regular user (non-admin)
        self.client.force_authenticate(regular_user)
        
        # Try to promote target user
        url = self._get_member_url(target_membership.id)
        payload = {"role": "admin"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("permission", str(response.data).lower())
        
        # Verify no change was made
        target_membership.refresh_from_db()
        self.assertEqual(target_membership.role, "member")

    def test_cannot_demote_last_admin(self):
        """Test that the last admin cannot be demoted"""
        # Create a regular member
        member_user = User.objects.create_user(
            email="member3@example.com", 
            password="pass123"
        )
        
        # Currently only one admin exists (self.admin_user)
        # Try to demote the last admin
        url = self._get_member_url(self.admin_membership.id)
        payload = {"role": "member"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("last admin", str(response.data).lower())
        
        # Verify admin still has admin role
        self.admin_membership.refresh_from_db()
        self.assertEqual(self.admin_membership.role, "admin")

    def test_cannot_change_to_same_role(self):
        """Test error when trying to change to the same role"""
        # Create a member
        member_user = User.objects.create_user(
            email="member4@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        # Try to change to same role
        url = self._get_member_url(member_membership.id)
        payload = {"role": "member"}  # Already a member
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already has the role", str(response.data).lower())
        
        # Verify no change was made
        member_membership.refresh_from_db()
        self.assertEqual(member_membership.role, "member")

    def test_invalid_role_value(self):
        """Test error when providing an invalid role value"""
        member_user = User.objects.create_user(
            email="member5@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        url = self._get_member_url(member_membership.id)
        payload = {"role": "invalid_role"}  # Invalid role
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("valid", str(response.data).lower())

    # ---------- DISPLAY NAME TESTS (Users only for themselves) ----------
    def test_user_can_update_own_display_name(self):
        """Test that a user can update their own display name"""
        # Create a regular member
        member_user = User.objects.create_user(
            email="member@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        # Authenticate as the member
        self.client.force_authenticate(member_user)
        
        url = self._get_member_url(member_membership.id)
        payload = {"display_name": "John Doe"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("display name updated successfully", response.data["message"])
        self.assertEqual(response.data["data"]["display_name"], "John Doe")
        
        # Verify the change
        member_membership.refresh_from_db()
        self.assertEqual(member_membership.display_name, "John Doe")

    def test_admin_cannot_update_others_display_name(self):
        """Test that an admin CANNOT update another member's display name"""
        # Create a regular member
        member_user = User.objects.create_user(
            email="member2@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user,
            display_name="Original Name"
        )

        # Authenticate as admin (already authenticated in setUp)
        url = self._get_member_url(member_membership.id)
        payload = {"display_name": "Admin Changed This"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("your own display name", str(response.data).lower())
        
        # Verify NO change was made
        member_membership.refresh_from_db()
        self.assertEqual(member_membership.display_name, "Original Name")

    def test_superuser_cannot_update_others_display_name(self):
        """Test that even a superuser CANNOT update another member's display name"""
        # Create a superuser
        superuser = self._create_superuser("super@example.com", "pass123")
        
        # Create a member
        member_user = User.objects.create_user(
            email="member3@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user,
            display_name="Original"
        )

        # Authenticate as superuser
        self.client.force_authenticate(superuser)
    
        url = self._get_member_url(member_membership.id)
        payload = {"display_name": "Superuser Changed"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("your own display name", str(response.data).lower())
        
        # Verify NO change was made
        member_membership.refresh_from_db()
        self.assertEqual(member_membership.display_name, "Original")

    def test_member_cannot_update_others_display_name(self):
        """Test that a regular member cannot update another member's display name"""
        # Create two regular members
        member1 = User.objects.create_user(email="member1@example.com", password="pass123")
        member2 = User.objects.create_user(email="member2@example.com", password="pass123")
        
        membership2 = Membership.objects.create(
            user=member2, organization=self.org, role="member", created_by=self.admin_user,
            display_name="Member2 Original"
        )

        # Authenticate as member1
        self.client.force_authenticate(member1)
        
        # Try to update member2's display name
        url = self._get_member_url(membership2.id)
        payload = {"display_name": "Changed Name"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("your own display name", str(response.data).lower())
        
        # Verify no change was made
        membership2.refresh_from_db()
        self.assertEqual(membership2.display_name, "Member2 Original")

    def test_empty_display_name_allowed(self):
        """Test that display name can be set to empty string"""
        member_user = User.objects.create_user(
            email="member6@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user,
            display_name="Some Name"
        )

        # Authenticate as the member
        self.client.force_authenticate(member_user)
        
        url = self._get_member_url(member_membership.id)
        payload = {"display_name": ""}  # Empty string
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify display name is now empty
        member_membership.refresh_from_db()
        self.assertEqual(member_membership.display_name, "")

    def test_admin_can_update_own_display_name_even_if_last_admin(self):
        """Test that an admin can update their own display name even if they're the last admin"""
        url = self._get_member_url(self.admin_membership.id)
        payload = {"display_name": "Last Admin Display Name"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify display name changed, role stayed same
        self.admin_membership.refresh_from_db()
        self.assertEqual(self.admin_membership.display_name, "Last Admin Display Name")
        self.assertEqual(self.admin_membership.role, "admin")  # Unchanged

    def test_user_can_update_both_their_own_role_and_display_name_if_admin(self):
        """Test that a user who is also an admin can update their own role and display name"""
        # Create a second admin
        admin2 = User.objects.create_user(
            email="admin2@example.com", 
            password="pass123"
        )
        admin2_membership = Membership.objects.create(
            user=admin2, 
            organization=self.org, 
            role="admin", 
            created_by=self.admin_user,
            display_name="Old Admin Name"
        )

        # Create another admin so admin2 is not the last admin
        admin3 = User.objects.create_user(
            email="admin3@example.com", 
            password="pass123"
        )
        Membership.objects.create(
            user=admin3, 
            organization=self.org, 
            role="admin", 
            created_by=self.admin_user
        )

        # Authenticate as admin2
        self.client.force_authenticate(admin2)
        
        # Admin2 updates their own role and display name
        url = self._get_member_url(admin2_membership.id)
        payload = {
            "role": "member",  # Demoting themselves
            "display_name": "New Member Name"
        }
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("role updated to 'member' and display name updated successfully", 
                      response.data["message"])
        
        # Verify both changes
        admin2_membership.refresh_from_db()
        self.assertEqual(admin2_membership.role, "member")
        self.assertEqual(admin2_membership.display_name, "New Member Name")

    # ---------- VALIDATION & ERROR TESTS ----------
    def test_no_fields_provided_returns_error(self):
        """Test that providing no fields returns validation error"""
        member_user = User.objects.create_user(
            email="member10@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        url = self._get_member_url(member_membership.id)
        payload = {}  # Empty payload
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("at least one", str(response.data).lower())

    # ---------- NOT FOUND CASES ----------
    def test_update_non_existent_membership(self):
        """Test updating a non-existent membership returns 404"""
        non_existent_uuid = uuid.uuid4()
        url = reverse(self.base_url, args=[self.org.id, non_existent_uuid])
        payload = {"role": "admin"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_inactive_membership(self):
        """Test that inactive/deleted memberships cannot be updated"""
        member_user = User.objects.create_user(
            email="inactive@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user,
            is_active=False,  # Inactive membership
            is_deleted=True
        )

        url = self._get_member_url(member_membership.id)
        payload = {"role": "admin"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ---------- EDGE CASES ----------
    def test_admin_can_change_own_role_if_not_last(self):
        """Test that an admin can change their own role if they're not the last admin"""
        # Create a second admin
        admin2 = User.objects.create_user(
            email="admin2@example.com", 
            password="pass123"
        )
        admin2_membership = Membership.objects.create(
            user=admin2, 
            organization=self.org, 
            role="admin", 
            created_by=self.admin_user
        )

        # Now we have 2 admins
        # Authenticate as admin2
        self.client.force_authenticate(admin2)
        
        # Admin2 tries to demote themselves (not the last admin)
        url = self._get_member_url(admin2_membership.id)
        payload = {"role": "member"}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["role"], "member")
        
        # Verify the change
        admin2_membership.refresh_from_db()
        self.assertEqual(admin2_membership.role, "member")
        
        # Original admin still exists as admin
        self.admin_membership.refresh_from_db()
        self.assertEqual(self.admin_membership.role, "admin")

    def test_display_name_max_length_enforced(self):
        """Test that display name max length is enforced"""
        member_user = User.objects.create_user(
            email="member14@example.com", 
            password="pass123"
        )
        member_membership = Membership.objects.create(
            user=member_user, 
            organization=self.org, 
            role="member", 
            created_by=self.admin_user
        )

        # Authenticate as the member
        self.client.force_authenticate(member_user)
        
        # Try to set display name longer than 255 characters
        long_name = "A" * 256  # 256 characters
        url = self._get_member_url(member_membership.id)
        payload = {"display_name": long_name}
        
        response = self.client.patch(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ensure this field has no more than", str(response.data).lower())
        
        # Try with exactly 255 characters (should work)
        valid_name = "A" * 255
        payload = {"display_name": valid_name}
        
        response = self.client.patch(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the change
        member_membership.refresh_from_db()
        self.assertEqual(member_membership.display_name, valid_name)
