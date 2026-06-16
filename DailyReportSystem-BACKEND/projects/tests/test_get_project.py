from projects.models import Project
from projects.tests import ProjectBaseTestCase
from rest_framework import reverse, status

from tasks.models import Task


class TestRetrieveProject(ProjectBaseTestCase):
    def test_project_details_includes_progress_data(self):
        # Tasks
        Task.objects.create(project=self.project, status="todo", expected_hours=2, created_by=self.admin_user, organisation=self.project.organization, reported_by=self.member_project_membership)
        Task.objects.create(project=self.project, status="todo", expected_hours=2, created_by=self.admin_user, organisation=self.project.organization, reported_by=self.member_project_membership)
        Task.objects.create(project=self.project, status="in_progress", expected_hours=2, created_by=self.admin_user, organisation=self.project.organization, reported_by=self.member_project_membership)
        Task.objects.create(project=self.project, status="done", expected_hours=2, created_by=self.admin_user, organisation=self.project.organization, reported_by=self.member_project_membership)
        Task.objects.create(project=self.project, status="done", expected_hours=2, created_by=self.admin_user, organisation=self.project.organization, reported_by=self.member_project_membership)

        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_payload):
            response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check main fields exist
        self.assertIn("id", response.data)
        self.assertIn("name", response.data)
        self.assertIn("description", response.data)

        # Check progress_data
        self.assertIn("progress_data", response.data)
        self.assertEqual(response.data["progress_data"]["todo"], 2)
        self.assertEqual(response.data["progress_data"]["in_progress"], 1)
        self.assertEqual(response.data["progress_data"]["done"], 2)

    def test_get_project_success(self):
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_payload):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_response_contains_expected_fields(self):
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_payload):
            response = self.client.get(self.url)
        
        project_data = response.data
        expected_fields = {
            "id", "reference", "name", "description", "members", "status",
            "translations", "start_date", "end_date", "is_active", "is_deleted", 
            "visibility", "owner_id", "owner_name", "owner_email", "progress_data",
        }
        self.assertEqual(set(project_data.keys()), expected_fields)

    def test_get_project_isolation_failure(self):
        """Should 404 if user is in Org B trying to access Org A's project."""
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth({"organisation_id": str(self.other_org.id)}):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_project_excluded_if_deleted(self):
        """Soft-deleted projects should not be retrievable via get_queryset."""
        self.project.is_deleted = True
        self.project.save()
        
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_payload):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)