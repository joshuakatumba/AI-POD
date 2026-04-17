from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership
from projects.models import Project
from projectMembers.models import ProjectMember
from core.tests.utils import MockAuthMixin
import uuid

User = get_user_model()


class TestAddProjectMember(MockAuthMixin, APITestCase):

    def setUp(self):
        # Admin user
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123"
        )

        # Organisation
        self.org = Organization.objects.create(
            name="Test Org",
            created_by=self.admin_user
        )

        # Admin membership (org-level)
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role="admin",
            created_by=self.admin_user,
        )

        # Project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.org,
            created_by=self.admin_user,
            owner=self.admin_membership,
        )

        # Admin must ALSO be project admin for permission to pass
        self.admin_project_member = ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.admin_membership,
            role="admin",
            status="active",
            created_by=self.admin_user,
        )

        # Member user (the one being added to project)
        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123"
        )

        self.member_membership = Membership.objects.create(
            user=self.member_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
        )

        # Auth payload
        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id),
        }

        # URL
        self.url = reverse(
            "projectMembers:project-members",
            kwargs={"project_id": self.project.id}
        )

    # ----------------------------
    # SUCCESS CASE
    # ----------------------------
    def test_add_member_success(self):
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.post(
                self.url,
                {"email": self.member_user.email, "role": "contributor"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertTrue(
            ProjectMember.objects.filter(
                project=self.project,
                membership=self.member_membership,
            ).exists()
        )

    # ----------------------------
    # AUTH FAILURES
    # ----------------------------
    def test_add_member_unauthenticated(self):
        response = self.client.post(
            self.url,
            {"email": self.member_user.email, "role": "contributor"},
            format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_member_permission_denied(self):
        """Non-admin project member cannot add members"""
        normal_user = User.objects.create_user(
            email="normal@example.com",
            password="password123"
        )

        normal_membership = Membership.objects.create(
            user=normal_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
        )

        # NOTE: no ProjectMember(role="admin") for this user

        self.client.force_authenticate(user=normal_user)

        with self.mock_auth({
            "organisation_id": str(self.org.id),
            "membership_id": str(normal_membership.id),
        }):
            response = self.client.post(
                self.url,
                {"email": self.member_user.email, "role": "contributor"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ----------------------------
    # BUSINESS RULES
    # ----------------------------
    def test_add_member_duplicate(self):
        """Cannot add same member twice"""
        ProjectMember.objects.create(
            project=self.project,
            organisation=self.org,
            membership=self.member_membership,
            role="contributor",
            created_by=self.admin_user,
        )

        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.post(
                self.url,
                {"email": self.member_user.email, "role": "contributor"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already exists", str(response.data))

    def test_add_member_user_not_found(self):
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.post(
                self.url,
                {"email": "nonexistent@example.com", "role": "contributor"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not exist", str(response.data))

    def test_add_member_not_in_organisation(self):
        outside_user = User.objects.create_user(
            email="outside@example.com",
            password="password123"
        )

        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.post(
                self.url,
                {"email": outside_user.email, "role": "contributor"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not a member", str(response.data))

    def test_add_member_missing_email(self):
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.post(
                self.url,
                {"role": "contributor"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_member_invalid_role(self):
        self.client.force_authenticate(user=self.admin_user)

        with self.mock_auth(self.admin_auth):
            response = self.client.post(
                self.url,
                {"email": self.member_user.email, "role": "invalid_role"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_member_invalid_project(self):
        self.client.force_authenticate(user=self.admin_user)

        url = reverse(
            "projectMembers:project-members",
            kwargs={"project_id": uuid.uuid4()}
        )

        with self.mock_auth(self.admin_auth):
            response = self.client.post(
                url,
                {"email": self.member_user.email, "role": "contributor"},
                format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)