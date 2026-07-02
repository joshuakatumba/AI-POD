from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
import uuid

from organizations.models import Organization, Membership

User = get_user_model()


class CreateOrganisationAPITests(APITestCase):

    def setUp(self):
        # Clear existing data to ensure clean state
        User.objects.all().delete()
        Organization.objects.all().delete()
        Membership.objects.all().delete()
        
        # ---------- USERS ----------
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123"
        )

        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123"
        )

        # Additional users for invited members tests
        self.invited_user1 = User.objects.create_user(
            email="invited1@example.com",
            password="password123"
        )
        
        self.invited_user2 = User.objects.create_user(
            email="invited2@example.com",
            password="password123"
        )
        
        self.non_existent_email = "doesnotexist@example.com"

        # ---------- EXISTING ORG + MEMBERSHIP (member_user is a member somewhere) ----------
        self.existing_org = Organization.objects.create(
            name="Existing Org",
            country="Uganda",
            created_by=self.admin_user,
        )

        # Create membership for member_user in existing_org
        Membership.objects.create(
            user=self.member_user,
            organization=self.existing_org,
            role="member",
            created_by=self.admin_user,
            is_active=True,
        )
        
        # Also create membership for invited_user1 in existing_org for the "already member elsewhere" test
        Membership.objects.create(
            user=self.invited_user1,
            organization=self.existing_org,
            role="member",
            created_by=self.admin_user,
            is_active=True,
        )

        # ---------- URL ----------
        self.create_org_url = reverse("organizations:organisations")

    # ---------- AUTH HELPER ----------
    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}"
        )
        return refresh

    # ---------- CREATE ORGANISATION - BASIC TESTS ----------

    def test_create_organisation_success(self):
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "SheWolf Media",
            "country": "Uganda",
            "email": "info@shewolfmedia.com",
            "description": "Digital security and media organisation",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check response structure
        self.assertIn("message", response.data)
        self.assertIn("data", response.data)
        self.assertEqual(response.data["message"], "organization.create_success")
        self.assertIn("id", response.data["data"])
        self.assertEqual(response.data["data"]["name"], "SheWolf Media")

        # Check database
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

    # ---------- CREATE ORGANISATION - INVITED MEMBERS TESTS ----------

    def test_create_organisation_with_single_invited_member(self):
        """Test creating an organisation with one invited member"""
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "Tech Startup",
            "country": "Kenya",
            "invited_members": ["invited1@example.com"]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check response includes invited members data
        self.assertIn("invited_members_added", response.data["data"])
        self.assertNotIn("invited_members_failed", response.data["data"])
        
        added_members = response.data["data"]["invited_members_added"]
        self.assertEqual(len(added_members), 1)
        self.assertEqual(added_members[0]["email"], "invited1@example.com")
        self.assertIn("membership_id", added_members[0])

        # Verify membership was created
        organisation = Organization.objects.get(name="Tech Startup")
        self.assertTrue(
            Membership.objects.filter(
                organization=organisation,
                user=self.invited_user1,
                role="member",
                is_active=True,
            ).exists()
        )

    def test_create_organisation_with_multiple_invited_members(self):
        """Test creating an organisation with multiple invited members"""
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "Marketing Agency",
            "country": "Nigeria",
            "invited_members": [
                "invited1@example.com",
                "invited2@example.com"
            ]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check response
        self.assertIn("invited_members_added", response.data["data"])
        added_members = response.data["data"]["invited_members_added"]
        self.assertEqual(len(added_members), 2)
        
        # Get emails from response
        added_emails = [m["email"] for m in added_members]
        self.assertIn("invited1@example.com", added_emails)
        self.assertIn("invited2@example.com", added_emails)

        # Verify memberships were created
        organisation = Organization.objects.get(name="Marketing Agency")
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation,
                role="member",
                is_active=True,
            ).count(),
            2
        )

    def test_create_organisation_with_mix_valid_invalid_emails(self):
        """Test creating organisation with both valid and invalid emails"""
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "Mixed Results Org",
            "country": "Ghana",
            "invited_members": [
                "invited1@example.com",  # valid
                "doesnotexist@example.com",  # invalid
                "invited2@example.com"  # valid
            ]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check both added and failed sections exist
        self.assertIn("invited_members_added", response.data["data"])
        self.assertIn("invited_members_failed", response.data["data"])
        
        # Check added members
        added_members = response.data["data"]["invited_members_added"]
        self.assertEqual(len(added_members), 2)
        added_emails = [m["email"] for m in added_members]
        self.assertIn("invited1@example.com", added_emails)
        self.assertIn("invited2@example.com", added_emails)
        
        # Check failed members
        failed_members = response.data["data"]["invited_members_failed"]
        self.assertEqual(len(failed_members), 1)
        self.assertEqual(failed_members[0]["email"], "doesnotexist@example.com")
        self.assertIn("does not exist", failed_members[0]["error"].lower())

        # Verify only valid users were added
        organisation = Organization.objects.get(name="Mixed Results Org")
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation,
                role="member",
                is_active=True,
            ).count(),
            2
        )

    def test_create_organisation_with_duplicate_invited_member(self):
        """Test inviting the same user twice in the same request"""
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "Duplicate Invite Org",
            "country": "Tanzania",
            "invited_members": [
                "invited1@example.com",
                "invited1@example.com"  # duplicate
            ]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # With deduplication, duplicates are removed before processing
        # So only one entry is processed and added successfully
        self.assertIn("invited_members_added", response.data["data"])
        self.assertNotIn("invited_members_failed", response.data["data"])  # Changed from assertIn
        
        added_members = response.data["data"]["invited_members_added"]
        self.assertEqual(len(added_members), 1)
        self.assertEqual(added_members[0]["email"], "invited1@example.com")

        # Verify only one membership was created
        organisation = Organization.objects.get(name="Duplicate Invite Org")
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation,
                user=self.invited_user1,
            ).count(),
            1
    )

    def test_create_organisation_with_empty_invited_members_list(self):
        """Test creating organisation with empty invited_members list"""
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "Empty Invites Org",
            "country": "Rwanda",
            "invited_members": []
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Should not include invited members sections
        self.assertNotIn("invited_members_added", response.data["data"])
        self.assertNotIn("invited_members_failed", response.data["data"])

        # Verify no members were added besides creator
        organisation = Organization.objects.get(name="Empty Invites Org")
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation
            ).count(),
            1  # Only the creator
        )
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation,
                user=self.admin_user,
                role="admin"
            ).count(),
            1
        )

    def test_create_organisation_without_invited_members_field(self):
        """Test creating organisation without invited_members field (backward compatibility)"""
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "No Invites Field Org",
            "country": "South Africa",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Should not include invited members sections
        self.assertNotIn("invited_members_added", response.data["data"])
        self.assertNotIn("invited_members_failed", response.data["data"])

        # Verify no members were added besides creator
        organisation = Organization.objects.get(name="No Invites Field Org")
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation
            ).count(),
            1  # Only the creator
        )

    def test_create_organisation_invite_user_already_member_elsewhere(self):
        """
        Test inviting a user who is already a member of another organization
        They should be able to join the new organization
        """
        self.authenticate(self.admin_user)

        # Verify initial state - invited_user1 should have 1 membership (in existing_org)
        initial_membership_count = Membership.objects.filter(
            user=self.invited_user1,
            is_active=True
        ).count()
        self.assertEqual(initial_membership_count, 1, 
                         "invited_user1 should have 1 membership initially (in existing_org)")
        
        response = self.client.post(self.create_org_url, {
            "name": "Another Org",
            "country": "Egypt",
            "invited_members": ["invited1@example.com"]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check invited member was added successfully
        self.assertIn("invited_members_added", response.data["data"])
        added_members = response.data["data"]["invited_members_added"]
        self.assertEqual(len(added_members), 1)
        self.assertEqual(added_members[0]["email"], "invited1@example.com")

        # Verify user now has two memberships (one in existing_org, one in new org)
        final_membership_count = Membership.objects.filter(
            user=self.invited_user1,
            is_active=True
        ).count()
        
        self.assertEqual(
            final_membership_count,
            2,  # One in existing_org, one in new org
            f"Expected 2 memberships for invited_user1, but got {final_membership_count}"
        )
        
        # Verify both memberships exist
        new_org = Organization.objects.get(name="Another Org")
        
        self.assertTrue(
            Membership.objects.filter(
                user=self.invited_user1,
                organization=self.existing_org,
                is_active=True
            ).exists(),
            "User should still be a member of the original organization"
        )
        
        self.assertTrue(
            Membership.objects.filter(
                user=self.invited_user1,
                organization=new_org,
                is_active=True
            ).exists(),
            "User should be a member of the new organization"
        )

    def test_create_organisation_invite_self_not_allowed(self):
        """
        Test that the creator cannot invite themselves as a member
        (They're already added as admin)
        """
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "Self Invite Org",
            "country": "Morocco",
            "invited_members": ["admin@example.com"]  # Creator's own email
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Should fail because user is already a member (as admin)
        self.assertIn("invited_members_failed", response.data["data"])
        failed_members = response.data["data"]["invited_members_failed"]
        self.assertEqual(len(failed_members), 1)
        self.assertEqual(failed_members[0]["email"], "admin@example.com")
        self.assertIn("already a member", failed_members[0]["error"].lower())
        
        self.assertNotIn("invited_members_added", response.data["data"])

        # Verify only one membership exists for creator (admin role)
        organisation = Organization.objects.get(name="Self Invite Org")
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation,
                user=self.admin_user
            ).count(),
            1
        )
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation,
                user=self.admin_user,
                role="admin"
            ).count(),
            1
        )

    def test_create_organisation_invite_nonexistent_users_all_fail(self):
        """Test inviting only non-existent users"""
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "All Fail Org",
            "country": "Zambia",
            "invited_members": [
                "nonexist1@example.com",
                "nonexist2@example.com"
            ]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Should only have failed section
        self.assertNotIn("invited_members_added", response.data["data"])
        self.assertIn("invited_members_failed", response.data["data"])
        
        failed_members = response.data["data"]["invited_members_failed"]
        self.assertEqual(len(failed_members), 2)
        
        # Verify no members were added besides creator
        organisation = Organization.objects.get(name="All Fail Org")
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation
            ).count(),
            1  # Only the creator
        )

    def test_create_organisation_invite_max_emails(self):
        """Test inviting many emails at once"""
        self.authenticate(self.admin_user)
        
        # Create 10 invited users with unique emails using UUID to avoid conflicts
        invited_emails = []
        for i in range(10):
            # Generate a truly unique email using UUID
            unique_id = str(uuid.uuid4())[:8]
            email = f"invited_{unique_id}_{i}@example.com"
            # Check if user already exists (shouldn't, but just in case)
            if not User.objects.filter(email=email).exists():
                User.objects.create_user(email=email, password="password123")
            invited_emails.append(email)

        response = self.client.post(self.create_org_url, {
            "name": "Bulk Invite Org",
            "country": "Ethiopia",
            "invited_members": invited_emails
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check all were added
        self.assertIn("invited_members_added", response.data["data"])
        added_members = response.data["data"]["invited_members_added"]
        self.assertEqual(len(added_members), 10)
        
        # Verify memberships were created
        organisation = Organization.objects.get(name="Bulk Invite Org")
        self.assertEqual(
            Membership.objects.filter(
                organization=organisation,
                role="member",
                is_active=True
            ).count(),
            10
        )

    def test_create_organisation_response_structure_with_invites(self):
        """Test the full response structure when invites are present"""
        self.authenticate(self.admin_user)

        response = self.client.post(self.create_org_url, {
            "name": "Response Test Org",
            "country": "Cameroon",
            "description": "Testing response structure",
            "email": "test@example.com",
            "invited_members": [
                "invited1@example.com",
                "doesnotexist@example.com"
            ]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check full response structure
        self.assertIn("message", response.data)
        self.assertIn("data", response.data)
        
        # Check organization data
        org_data = response.data["data"]
        self.assertIn("id", org_data)
        self.assertIn("name", org_data)
        self.assertIn("type", org_data)
        self.assertIn("description", org_data)
        self.assertIn("email", org_data)
        self.assertIn("country", org_data)
        
        # Check invited members sections
        self.assertIn("invited_members_added", org_data)
        self.assertIn("invited_members_failed", org_data)
        
        # Check added member structure
        added = org_data["invited_members_added"][0]
        self.assertIn("email", added)
        self.assertIn("membership_id", added)
        
        # Check failed member structure
        failed = org_data["invited_members_failed"][0]
        self.assertIn("email", failed)
        self.assertIn("error", failed)

    def test_create_organisation_member_cannot_use_invites(self):
        """
        Test that a regular member cannot create an organization 
        even with invited_members field (should be denied at permission level)
        """
        self.authenticate(self.member_user)

        response = self.client.post(self.create_org_url, {
            "name": "Member Try Org",
            "country": "Botswana",
            "invited_members": ["invited1@example.com"]
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Verify no organization was created
        self.assertFalse(
            Organization.objects.filter(name="Member Try Org").exists()
        )
