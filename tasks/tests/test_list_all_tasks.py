import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from organizations.models import Organization, Membership
from projects.models import Project
from projectMembers.models import ProjectMember
from tasks.models import Task

User = get_user_model()


class TaskListViewTests(APITestCase):

    def setUp(self):
        # ---------- USERS ----------
        self.user = User.objects.create_user(email="member@example.com", password="pass")
        self.outsider = User.objects.create_user(email="outsider@example.com", password="pass")
        self.second_user = User.objects.create_user(email="member2@example.com", password="pass")

        # ---------- ORGANIZATION ----------
        self.organisation = Organization.objects.create(
            name="Test Org",
            country="Uganda",
            created_by=self.user,
        )

        # ---------- MEMBERSHIPS ----------
        self.membership = Membership.objects.create(
            user=self.user,
            organization=self.organisation,
            role="admin",
            created_by=self.user,
            is_active=True,
        )
        self.second_membership = Membership.objects.create(
            user=self.second_user,
            organization=self.organisation,
            role="member",
            created_by=self.user,
            is_active=True,
        )

        # ---------- PROJECTS ----------
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organisation,
            owner=self.membership,
            created_by=self.user,
        )
        self.other_project = Project.objects.create(
            name="Other Project",
            organization=self.organisation,
            owner=self.membership,
            created_by=self.user,
        )

        # ---------- PROJECT MEMBERS ----------
        self.project_member = ProjectMember.objects.create(
            membership=self.membership,
            project=self.project,
            organisation=self.organisation,
            role="admin",
            created_by=self.user,
        )
        self.second_project_member = ProjectMember.objects.create(
            membership=self.second_membership,
            project=self.project,
            organisation=self.organisation,
            role="contributor",
            created_by=self.user,
        )

        # ---------- URL ----------
        self.url = reverse("tasks:tasks", kwargs={"project_id": self.project.id})

    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    def _create_task(self, name="Test Task", task_status="backlog", assigned_to=None, project=None):
        return Task.objects.create(
            name=name,
            description="Some description",
            expected_hours=Decimal("3.0"),
            status=task_status,
            project=project or self.project,
            organisation=self.organisation,
            reported_by=self.project_member,
            assigned_to=assigned_to,
            created_by=self.user,
        )

    # -------------------------
    # Authentication
    # -------------------------

    def test_unauthenticated_request_returns_401(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------
    # Authorisation
    # -------------------------

    def test_non_project_member_returns_403(self):
        self.authenticate(self.outsider)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_project_member_can_list_tasks(self):
        self.authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # -------------------------
    # 404
    # -------------------------

    def test_nonexistent_project_returns_404(self):
        self.authenticate(self.user)
        url = reverse("tasks:tasks", kwargs={"project_id": uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # -------------------------
    # Basic listing
    # -------------------------

    def test_returns_empty_list_when_project_has_no_tasks(self):
        self.authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_returns_all_tasks_in_project(self):
        self._create_task(name="Task A")
        self._create_task(name="Task B")
        self.authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_does_not_return_tasks_from_other_projects(self):
        self._create_task(name="My Task")
        self._create_task(name="Other Task", project=self.other_project)
        self.authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "My Task")

    # -------------------------
    # Response shape
    # -------------------------

    def test_response_contains_expected_fields(self):
        self._create_task()
        self.authenticate(self.user)
        response = self.client.get(self.url)
        task_data = response.data[0]
        expected_fields = {
            "id", "reference", "name", "description", "due_date", "category",
            "expected_hours", "status", "organisation", "project", "priority",
            "assigned_to", "reported_by", "created_by", "created_at", "closed_at", "translations", "attachments",
        }
        self.assertEqual(set(task_data.keys()), expected_fields)

    def test_response_task_belongs_to_correct_project(self):
        self._create_task()
        self.authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(str(response.data[0]["project"]["id"]), str(self.project.id))

    # -------------------------
    # Status filter
    # -------------------------

    def test_status_filter_returns_only_matching_tasks(self):
        self._create_task(name="Backlog Task", task_status="backlog")
        self._create_task(name="In Progress Task", task_status="in_progress")
        self.authenticate(self.user)
        response = self.client.get(self.url, {"status": "backlog"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Backlog Task")

    def test_status_filter_returns_empty_when_no_tasks_match(self):
        self._create_task(task_status="backlog")
        self.authenticate(self.user)
        response = self.client.get(self.url, {"status": "closed"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_no_status_filter_returns_tasks_of_all_statuses(self):
        self._create_task(name="Backlog Task", task_status="backlog")
        self._create_task(name="In Progress Task", task_status="in_progress")
        self.authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 2)

    def test_status_filter_returns_multiple_matching_tasks(self):
        self._create_task(name="Backlog A", task_status="backlog")
        self._create_task(name="Backlog B", task_status="backlog")
        self._create_task(name="In Progress", task_status="in_progress")
        self.authenticate(self.user)
        response = self.client.get(self.url, {"status": "backlog"})
        self.assertEqual(len(response.data), 2)

    # -------------------------
    # Assigned-to filter
    # -------------------------

    def test_assigned_to_filter_returns_only_matching_tasks(self):
        self._create_task(name="Assigned Task", assigned_to=self.project_member)
        self._create_task(name="Unassigned Task", assigned_to=None)
        self.authenticate(self.user)
        response = self.client.get(self.url, {"assigned_to": str(self.project_member.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Assigned Task")

    def test_assigned_to_filter_excludes_tasks_assigned_to_other_members(self):
        self._create_task(name="Member 2 Task", assigned_to=self.second_project_member)
        self.authenticate(self.user)
        response = self.client.get(self.url, {"assigned_to": str(self.project_member.id)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_assigned_to_filter_returns_empty_for_unknown_member_id(self):
        self._create_task(assigned_to=self.project_member)
        self.authenticate(self.user)
        response = self.client.get(self.url, {"assigned_to": str(uuid.uuid4())})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_no_assigned_to_filter_returns_assigned_and_unassigned_tasks(self):
        self._create_task(name="Assigned", assigned_to=self.project_member)
        self._create_task(name="Unassigned", assigned_to=None)
        self.authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(len(response.data), 2)

    # -------------------------
    # Combined filters
    # -------------------------

    def test_status_and_assigned_to_filters_combined(self):
        self._create_task(name="Match", task_status="in_progress", assigned_to=self.project_member)
        self._create_task(name="Wrong Status", task_status="backlog", assigned_to=self.project_member)
        self._create_task(name="Wrong Member", task_status="in_progress", assigned_to=self.second_project_member)
        self.authenticate(self.user)
        response = self.client.get(self.url, {
            "status": "in_progress",
            "assigned_to": str(self.project_member.id),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Match")