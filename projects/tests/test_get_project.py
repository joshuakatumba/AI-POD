from projects.tests import ProjectBaseTestCase
from rest_framework import status


class TestRetrieveProject(ProjectBaseTestCase):
    def test_get_project_success(self):
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_payload):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

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