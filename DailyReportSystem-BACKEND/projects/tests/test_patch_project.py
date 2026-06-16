from projects.tests import ProjectBaseTestCase
from rest_framework import status


class TestUpdateProject(ProjectBaseTestCase):
    def test_patch_success_as_admin(self):
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_payload):
            response = self.client.patch(self.url, {"name": "New Name"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.project.refresh_from_db()
        self.assertEqual(self.project.name, "New Name")

    def test_patch_forbidden_as_regular_member(self):
        """Members have membership but role is not 'admin'."""
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_payload):
            response = self.client.patch(self.url, {"name": "Hacker Name"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_success_as_superuser_bypass(self):
        self.client.force_authenticate(self.superuser)
        with self.mock_auth(self.admin_payload):
            response = self.client.patch(self.url, {"name": "Super Name"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)