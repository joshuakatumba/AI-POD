from rest_framework import status
from django.urls import reverse
from uuid import uuid4
from core.tests.utils import MockAuthMixin
from rest_framework.test import APITestCase
from projects.models import Project
from organizations.models import Organization, Membership
from django.contrib.auth import get_user_model

User = get_user_model()


class ProjectBaseTestCase(MockAuthMixin, APITestCase):
    def setUp(self):
        # Users
        self.admin_user = User.objects.create_user(email="admin@test.com", password="pass")
        self.member_user = User.objects.create_user(email="member@test.com", password="pass")
        self.stranger = User.objects.create_user(email="stranger@test.com", password="pass")
        self.superuser = User.objects.create_superuser(email="root@test.com", password="pass")

        # Organizations
        self.org = Organization.objects.create(name="Tech Corp", created_by=self.admin_user)
        self.other_org = Organization.objects.create(name="Other Tech Corp", created_by=self.admin_user)

        # Memberships
        self.admin_membership = Membership.objects.create(
            user=self.admin_user, organization=self.org, role="admin", created_by=self.admin_user
        )
        self.member_membership = Membership.objects.create(
            user=self.member_user, organization=self.org, role="member", created_by=self.admin_user
        )

        # Projects
        self.project = Project.objects.create(
            name="Active Project",
            organization=self.org,
            owner=self.admin_membership,
            created_by=self.admin_user,
            is_active=True,
            is_deleted=False
        )
        
        self.url = reverse("projects:project", kwargs={"project_id": self.project.id})

        # Standard Payloads
        self.admin_payload = {"organisation_id": str(self.org.id)}
        self.member_payload = {"organisation_id": str(self.org.id)}
