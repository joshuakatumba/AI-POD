from organizations.models import Membership
from projects.tests import ProjectBaseTestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class TestDeleteProject(ProjectBaseTestCase):
    def test_delete_success_as_owner(self):
        """Admin user created this project (owner=admin_membership)."""
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_payload):
            response = self.client.delete(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.data)
        self.assertEqual(response.data["detail"], "Project successfully deleted.")
        self.assertEqual(response.data["deleted_by"], self.admin_user.email)

        self.project.refresh_from_db()
        self.assertTrue(self.project.is_deleted)
        self.assertEqual(self.project.is_deleted_by_email, self.admin_user.email)

    def test_delete_forbidden_as_non_owner_admin(self):
        """
        Scenario: Another admin in the same org tries to delete.
        Permission requires obj.owner.user_id == user.id.
        """
        other_admin = User.objects.create_user(email="otheradmin@test.com", password="p")
        other_admin_mem = Membership.objects.create(user=other_admin, organization=self.org, role="admin", created_by=self.admin_user)
        
        self.client.force_authenticate(other_admin)
        with self.mock_auth(self.admin_payload):
            response = self.client.delete(self.url)

        
        # They pass CanUpdate (Role check) but fail CanDelete (Owner check)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_success_as_superuser(self):
        self.client.force_authenticate(self.superuser)
        with self.mock_auth(self.admin_payload):
            response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_fail_missing_token_org_id(self):
        """get_queryset will fail to find the object if the token org_id is missing."""
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth({}): # Empty payload
            response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)