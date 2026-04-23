from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from uuid import uuid4

from core.tests.utils import MockAuthMixin
from organizations.models import Organization, Membership
from projectMembers.models import ProjectMember
from projects.models import Project

User = get_user_model()


class TestReadProjects(MockAuthMixin, APITestCase):
    def setUp(self):
        # 1. Setup Users
        self.admin_user = User.objects.create_user(email="admin@example.com", password="pass")
        self.member_user = User.objects.create_user(email="member@example.com", password="pass")
        self.random_user = User.objects.create_user(email="stranger@example.com", password="pass")
        self.superuser = User.objects.create_superuser(email="root@example.com", password="pass")

        # 2. Setup Organization
        self.org = Organization.objects.create(name="Tech Corp", created_by=self.admin_user)
        self.other_org = Organization.objects.create(name="Other Tech Corp", created_by=self.admin_user)

        # 3. Setup Memberships
        self.admin_membership = Membership.objects.create(
            user=self.admin_user, organization=self.org, role="admin", created_by=self.admin_user
        )
        self.normal_membership = Membership.objects.create(
            user=self.member_user, organization=self.org, role="member", created_by=self.admin_user
        )

        self.url = reverse("projects:projects")

        # Payloads
        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id)
        }
        self.member_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.normal_membership.id)
        }

        # --- Additional users for project membership filtering ---
        self.user_a = User.objects.create_user(email="a@example.com", password="pass")
        self.user_b = User.objects.create_user(email="b@example.com", password="pass")

        self.membership_a = Membership.objects.create(
            user=self.user_a,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
        )

        self.membership_b = Membership.objects.create(
            user=self.user_b,
            organization=self.org,
            role="member",
            created_by=self.admin_user,
        )

    # --- Helpers ---
    def get_projects(self, auth=None, params=None):
        """
        Perform GET request with optional auth and query parameters.
        
        Args:
            auth (dict): Optional auth dict with "organisation_id", "membership_id", and optionally "user".
            params (dict): Optional query params for pagination, search, etc.
        
        Returns:
            Response: DRF test client response
        """
        params = params or {}

        if auth:
            self.client.force_authenticate(auth.get("user", self.admin_user))
            with self.mock_auth(auth):
                return self.client.get(self.url, params)
        return self.client.get(self.url, params)


    def create_project(self, name="Project", org=None, owner=None, deleted=False):
        """Create a project for testing."""
        return Project.objects.create(
            name=name,
            organization=org or self.org,
            owner=owner or self.admin_membership,
            created_by=self.admin_user,
            is_deleted=deleted,
        )

    # --- Tests ---
    def test_list_projects_only_org(self):
        """GET should return only projects for the organisation in the token."""
        self.create_project(name="Project A")
        self.create_project(name="Project B")
        self.create_project(name="Other Project", org=self.other_org)

        response = self.get_projects(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['results'][0]["name"], "Project B")  # latest first
        self.assertEqual(response.data['results'][1]["name"], "Project A")

    
    def test_response_contains_expected_fields(self):
        self.create_project(name="Project A")
        self.create_project(name="Project B")
        
        response = self.get_projects(auth=self.admin_auth)
        
        project_data = response.data['results'][0]
        expected_fields = {
            "id", "reference", "name", "description", "members", "status",
            "translations", "start_date", "end_date", "is_active", "is_deleted", 
            "visibility", "owner_id", "owner_name", "owner_email",
        }
        self.assertEqual(set(project_data.keys()), expected_fields)

    def test_list_projects_empty(self):
        """GET returns empty list if no projects exist."""
        response = self.get_projects(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'], [])

    def test_list_projects_excludes_deleted(self):
        """GET should skip projects marked as deleted."""
        self.create_project(name="Active Project")
        self.create_project(name="Deleted Project", deleted=True)

        response = self.get_projects(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]["name"], "Active Project")

    def test_list_projects_unauthenticated(self):
        """GET returns 401 if unauthenticated."""
        response = self.get_projects()
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_projects_owner_fields(self):
        """GET includes owner_id, owner_name, owner_email."""
        self.create_project(name="Project With Owner")

        response = self.get_projects(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["results"][0]
        self.assertEqual(data["owner_id"], str(self.admin_membership.id))
        self.assertEqual(data["owner_name"], self.admin_membership.display_name)
        self.assertEqual(data["owner_email"], self.admin_membership.user.email)


    # --- Pagination & Search Tests ---

    def test_list_projects_pagination(self):
        """GET should paginate projects with default page_size=10."""
        # Create 15 projects
        for i in range(15):
            self.create_project(name=f"Project {i+1}")

        # First page
        response = self.get_projects(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 10)
        self.assertEqual(response.data["count"], 15)
        self.assertIsNotNone(response.data["next"])
        self.assertIsNone(response.data["previous"])

        # Second page
        response = self.get_projects(auth=self.admin_auth, params={"page": 2})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertEqual(response.data["count"], 15)
        self.assertIsNone(response.data["next"])
        self.assertIsNotNone(response.data["previous"])


    def test_list_projects_pagination_custom_page_size(self):
        """GET should respect page_size query param."""
        for i in range(8):
            self.create_project(name=f"Project {i+1}")

        response = self.get_projects(auth=self.admin_auth, params={"page_size": 5})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertEqual(response.data["count"], 8)
        self.assertIsNotNone(response.data["next"])


    # --- Search Tests ---
    def test_list_projects_search_name(self):
        """GET should filter projects by name using search query."""
        self.create_project(name="Alpha Project")
        self.create_project(name="Beta Project")
        self.create_project(name="Gamma Task")

        response = self.get_projects(auth=self.admin_auth, params={"search": "Project"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)
        names = [p["name"] for p in response.data["results"]]
        self.assertIn("Alpha Project", names)
        self.assertIn("Beta Project", names)


    def test_list_projects_search_description(self):
        """GET should filter projects by description using search query."""
        self.create_project(name="Project A", org=self.org, owner=self.admin_membership, deleted=False)
        self.create_project(name="Project B", org=self.org, owner=self.admin_membership, deleted=False)
        self.create_project(name="Project C", org=self.org, owner=self.admin_membership, deleted=False)

        # Add descriptions
        Project.objects.filter(name="Project A").update(description="Urgent Alpha")
        Project.objects.filter(name="Project B").update(description="Beta is important")
        Project.objects.filter(name="Project C").update(description="Gamma task")

        response = self.get_projects(auth=self.admin_auth, params={"search": "urgent"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Project A")

    def test_list_projects_filter_by_user_id(self):
        """Should return only projects where user is a project member via membership."""
        # # Projects for membership filtering
        project_a = self.create_project(name="Project A", owner=self.membership_a, deleted=False)
        project_b = self.create_project(name="Project B", owner=self.membership_b, deleted=False)

        # Link memberships → projects
        ProjectMember.objects.create(
            project=project_a,
            organisation=self.org,
            membership=self.membership_a,
            created_by=self.user_a,
        )

        ProjectMember.objects.create(
            project=project_b,
            organisation=self.org,
            membership=self.membership_b,
            created_by=self.user_b,
        )

        # Get project response 
        response = self.get_projects(
            auth=self.admin_auth,
            params={"member_user_id": str(self.user_a.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        results = response.data["results"]
        names = [p["name"] for p in results]

        self.assertIn("Project A", names)
        self.assertNotIn("Project B", names)
        self.assertNotIn("Project C", names)

    def test_list_projects_filter_by_user_id_returns_empty(self):
        """User not linked to any project should return empty list."""
        # # Projects for membership filtering
        project_a = self.create_project(name="Project A", owner=self.membership_a, deleted=False)
        project_b = self.create_project(name="Project B", owner=self.membership_b, deleted=False)

        # Link memberships → projects
        ProjectMember.objects.create(
            project=project_a,
            organisation=self.org,
            membership=self.membership_a,
            created_by=self.user_a,
        )

        ProjectMember.objects.create(
            project=project_b,
            organisation=self.org,
            membership=self.membership_b,
            created_by=self.user_b,
        )

        # Get project response
        response = self.get_projects(
            auth=self.admin_auth,
            params={"member_user_id": str(self.random_user.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_list_projects_user_filter_respects_organisation(self):
        """member_user_id filter must NOT return projects from other orgs."""
        other_project = self.create_project(name="Other Org Project")

        other_membership = Membership.objects.create(
            user=self.user_a,
            organization=self.other_org,
            role="member",
            created_by=self.admin_user,
        )

        ProjectMember.objects.create(
            project=other_project,
            organisation=self.other_org,
            membership=other_membership,
            created_by=self.admin_user,
        )

        response = self.get_projects(
            auth=self.admin_auth,
            params={"member_user_id": str(self.user_a.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # must NOT include cross-org project
        names = [p["name"] for p in response.data["results"]]
        self.assertNotIn("Other Org Project", names)