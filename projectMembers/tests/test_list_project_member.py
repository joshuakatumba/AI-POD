from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership
from projects.models import Project
from projectMembers.models import ProjectMember
from core.tests.utils import MockAuthMixin

User = get_user_model()


class TestListProjectMembers(MockAuthMixin, APITestCase):

    def setUp(self):
        # Admin user
        self.admin_user = User.objects.create_user(email="admin@example.com", password="password123")

        # Organisation
        self.org = Organization.objects.create(name="Test Org", created_by=self.admin_user)

        # Admin membership
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role="admin",
            display_name="Admin User",
            created_by=self.admin_user,
        )

        # Regular member users
        self.member_user_1 = User.objects.create_user(email="member1@example.com", password="password123")
        self.member_membership_1 = Membership.objects.create(
            user=self.member_user_1,
            organization=self.org,
            role="member",
            display_name="Member One",
            created_by=self.admin_user,
        )

        self.member_user_2 = User.objects.create_user(email="member2@example.com", password="password123")
        self.member_membership_2 = Membership.objects.create(
            user=self.member_user_2,
            organization=self.org,
            role="member",
            display_name="Member Two",
            created_by=self.admin_user,
        )

        # Project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.org,
            created_by=self.admin_user,
            owner=self.admin_membership,
        )

        # Add members to project
        self.project_member_1 = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.admin_membership,
            role="product_owner",
            status="active",
            created_by=self.admin_user,
        )
        self.project_member_2 = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.member_membership_1,
            role="contributor",
            status="active",
            created_by=self.admin_user,
        )
        self.project_member_3 = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.member_membership_2,
            role="admin",
            status="pending",
            created_by=self.admin_user,
        )

        # Auth payload
        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id),
        }

        # URL
        self.url = reverse("projectMembers:project-members", kwargs={"project_id": self.project.id})

    def test_list_project_members_success(self):
        """Test successfully listing all project members"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_list_project_members_unauthenticated(self):
        """Test that unauthenticated users cannot list members"""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_project_members_non_org_member(self):
        """Test that non-organization members cannot list project members"""
        outside_user = User.objects.create_user(email="outside@example.com", password="password123")
        self.client.force_authenticate(user=outside_user)
        with self.mock_auth({"organisation_id": str(self.org.id), "membership_id": "fake-id"}):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_project_members_empty_project(self):
        """Test listing project with no members"""
        empty_project = Project.objects.create(
            name="Empty Project",
            organization=self.org,
            created_by=self.admin_user,
            owner=self.admin_membership,
        )
        url = reverse("projectMembers:project-members", kwargs={"project_id": empty_project.id})

        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_project_members_search_by_name(self):
        """Test searching project members by name"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.get(self.url, {"search": "Member One"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["member_name"], "Member One")

    def test_list_project_members_search_by_email(self):
        """Test searching project members by email"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.get(self.url, {"search": "member2@example.com"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["member_email"], "member2@example.com")

    def test_list_project_members_excludes_deleted(self):
        """Test that deleted members are not listed"""
        self.project_member_2.is_deleted = True
        self.project_member_2.save()

        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Only 2 non-deleted members

    def test_list_project_members_response_structure(self):
        """Test that response contains correct fields"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check first member has all expected fields
        member = response.data[0]
        self.assertIn("id", member)
        self.assertIn("reference", member)
        self.assertIn("member_id", member)
        self.assertIn("member_name", member)
        self.assertIn("member_email", member)
        self.assertIn("role", member)
        self.assertIn("status", member)
        self.assertIn("is_active", member)
        self.assertIn("is_deleted", member)

    def test_list_project_members_ordered_by_created_at(self):
        """Test that members are ordered by created_at descending"""
        self.client.force_authenticate(user=self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Most recent first (project_member_3 was created last)
        self.assertEqual(response.data[0]["member_id"], str(self.member_membership_2.id))

    def test_list_project_members_regular_member_can_view(self):
        """Test that regular org members can view project members"""
        self.client.force_authenticate(user=self.member_user_1)
        member_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.member_membership_1.id),
        }
        with self.mock_auth(member_auth):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)