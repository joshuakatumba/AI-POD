from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import MockAuthMixin

User = get_user_model()


class TestSysAdminUserPatch(MockAuthMixin, APITestCase):

    def setUp(self):
        # Superuser
        self.superuser = User.objects.create_superuser(
            email="root@example.com", password="pass"
        )

        # Normal user
        self.normal_user = User.objects.create_user(
            email="user@example.com", password="pass"
        )

        # Another superuser to test protection
        self.other_superuser = User.objects.create_superuser(
            email="other_root@example.com", password="pass"
        )

        self.url = lambda user_id: reverse("sysadmin:users-details", args=[str(user_id)])

    # -------------------
    # Helper
    # -------------------
    def patch_user(self, user, data):
        self.client.force_authenticate(self.superuser)
        return self.client.patch(self.url(user.id), data, format="json")

    # -------------------
    # Tests
    # -------------------

    def test_toggle_is_active(self):
        """Superadmin can toggle is_active."""
        self.assertTrue(self.normal_user.is_active)
        response = self.patch_user(self.normal_user, {"is_active": False})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.normal_user.refresh_from_db()
        self.assertFalse(self.normal_user.is_active)

    def test_toggle_is_staff(self):
        """Superadmin can toggle admin role (is_staff)."""
        self.assertFalse(self.normal_user.is_staff)
        response = self.patch_user(self.normal_user, {"is_staff": True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.normal_user.refresh_from_db()
        self.assertTrue(self.normal_user.is_staff)

    def test_toggle_is_superuser(self):
        """Superadmin can toggle superuser on normal users."""
        self.assertFalse(self.normal_user.is_superuser)
        response = self.patch_user(self.normal_user, {"is_superuser": True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.normal_user.refresh_from_db()
        self.assertTrue(self.normal_user.is_superuser)

    def test_cannot_deactivate_self(self):
        """Superadmin cannot deactivate their own account."""
        response = self.patch_user(self.superuser, {"is_active": False})
        print("Data: ", response.data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.is_active)

    def test_cannot_remove_self_staff(self):
        """Superadmin cannot remove their own admin role."""
        response = self.patch_user(self.superuser, {"is_staff": False})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.is_staff)

    def test_cannot_remove_self_superuser(self):
        """Superadmin cannot remove their own superuser privileges."""
        response = self.patch_user(self.superuser, {"is_superuser": False})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.superuser.refresh_from_db()
        self.assertTrue(self.superuser.is_superuser)

    def test_cannot_remove_other_superuser(self):
        """Cannot remove superuser status from another superuser."""
        response = self.patch_user(self.other_superuser, {"is_superuser": False})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.other_superuser.refresh_from_db()
        self.assertTrue(self.other_superuser.is_superuser)

    def test_unauthenticated_forbidden(self):
        """PATCH returns 401 if unauthenticated."""
        response = self.client.patch(self.url(self.normal_user.id), {"is_active": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_superadmin_forbidden(self):
        """PATCH returns 403 if not a superadmin."""
        self.client.force_authenticate(self.normal_user)
        response = self.client.patch(self.url(self.normal_user.id), {"is_active": False}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)