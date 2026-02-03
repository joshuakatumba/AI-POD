import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from django.contrib.auth import get_user_model
from organizations.models import Organization, Membership

User = get_user_model()


@pytest.mark.django_db
class TestAddUserToOrganizationView:

    def setup_method(self):
        self.client = APIClient()

        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123"
        )
        self.client.force_authenticate(self.admin_user)

        # Shared organisation for all tests
        self.org = Organization.objects.create(
            name="Org1",
            created_by=self.admin_user
        )

        # Admin membership
        Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role="admin",
            created_by=self.admin_user
        )

        self.url = reverse(
            "organizations:add-members",
            args=[self.org.id]
        )

    def test_add_member_success(self):
        member_user = User.objects.create_user(
            email="member@example.com",
            password="password123"
        )

        payload = {"email": member_user.email}
        response = self.client.post(self.url, payload)

        assert response.status_code == 201
        assert response.data["message"] == "User added successfully"
        assert response.data["role"] == "member"

    def test_add_member_user_not_found(self):
        payload = {"email": "nonexistent@example.com"}
        response = self.client.post(self.url, payload)

        assert response.status_code == 400
        assert "does not exist" in str(response.data)

    def test_add_member_duplicate(self):
        user = User.objects.create_user(
            email="dup@example.com",
            password="pass123"
        )
        Membership.objects.create(
            user=user,
            organization=self.org,
            role="member",
            created_by=self.admin_user
        )

        payload = {"email": user.email}
        response = self.client.post(self.url, payload)

        assert response.status_code == 400
        assert "already a member" in str(response.data)

    def test_add_member_permission_denied(self):
        normal_user = User.objects.create_user(
            email="normal@example.com",
            password="password123"
        )
        Membership.objects.create(
            user=normal_user,
            organization=self.org,
            role="member",
            created_by=self.admin_user
        )

        self.client.force_authenticate(normal_user)

        member_user = User.objects.create_user(
            email="member2@example.com",
            password="password123"
        )

        payload = {"email": member_user.email}
        response = self.client.post(self.url, payload)

        assert response.status_code == 403
        assert "permission" in str(response.data).lower()
