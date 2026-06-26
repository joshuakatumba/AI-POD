from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from datetime import timedelta
import uuid

from organizations.models import Organization, Membership
from projects.models import Project
from projectMembers.models import ProjectMember
from tasks.models import Task

User = get_user_model()


class TaskCreateAPITests(APITestCase):

    def setUp(self):
        # ---------- USERS ----------
        self.creator_user = User.objects.create_user(
            email="creator@example.com",
            password="password123",
        )
        self.member_user = User.objects.create_user(
            email="member@example.com",
            password="password123",
        )
        self.outsider_user = User.objects.create_user(
            email="outsider@example.com",
            password="password123",
        )

        # ---------- ORGANIZATION ----------
        self.organization = Organization.objects.create(
            name="Test Organization",
            country="Uganda",
            created_by=self.creator_user,
        )

        # ---------- MEMBERSHIPS ----------
        self.creator_membership = Membership.objects.create(
            user=self.creator_user,
            organization=self.organization,
            role="admin",
            created_by=self.creator_user,
            is_active=True,
        )
        self.member_membership = Membership.objects.create(
            user=self.member_user,
            organization=self.organization,
            role="member",
            created_by=self.creator_user,
            is_active=True,
        )
        self.outsider_membership = Membership.objects.create(
            user=self.outsider_user,
            organization=self.organization,
            role="member",
            created_by=self.creator_user,
            is_active=True,
        )

        # ---------- PROJECTS ----------
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization,
            owner=self.creator_membership,
            created_by=self.creator_user,
        )
        self.other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.creator_membership,
            created_by=self.creator_user,
        )

        # ---------- PROJECT MEMBERS ----------
        self.creator_member = ProjectMember.objects.create(
            membership=self.creator_membership,
            organisation=self.organization,
            project=self.project,
            role="admin",
            created_by=self.creator_user,
        )
        self.member = ProjectMember.objects.create(
            membership=self.member_membership,
            organisation=self.organization,
            project=self.project,
            role="contributor",
            created_by=self.creator_user,
        )
        self.other_project_member = ProjectMember.objects.create(
            membership=self.outsider_membership,
            organisation=self.organization,
            project=self.other_project,
            role="contributor",
            created_by=self.creator_user,
        )

        # ---------- URL ----------
        self.url = reverse("tasks:tasks", kwargs={"project_id": self.project.id})

        # ---------- VALID PAYLOAD ----------
        self.valid_payload = {
            "name": "Implement login feature",
            "description": "Build JWT-based login",
            "due_date": (timezone.now() + timedelta(days=7)).isoformat(),
            "expected_hours": 5.0,
        }

    # ---------- AUTH HELPER ----------
    def authenticate(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    # ==========================================================================
    # AUTHENTICATION
    # ==========================================================================

    def test_create_task_unauthenticated(self):
        response = self.client.post(self.url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ==========================================================================
    # PERMISSIONS — project membership
    # ==========================================================================

    def test_create_task_as_project_member_success(self):
        self.authenticate(self.member_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_task_as_non_member_forbidden(self):
        """User not in the project cannot create tasks."""
        self.authenticate(self.outsider_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_task_project_not_found(self):
        self.authenticate(self.creator_user)

        url = reverse("tasks:tasks", kwargs={"project_id": uuid.uuid4()})
        response = self.client.post(url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ==========================================================================
    # SUCCESS — basic creation
    # ==========================================================================

    def test_create_task_success_response_structure(self):
        self.authenticate(self.creator_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        for field in ["id", "reference", "name", "status", "project", "created_by"]:
            self.assertIn(field, response.data)

    def test_create_task_persisted_in_database(self):
        self.authenticate(self.creator_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Task.objects.filter(name="Implement login feature").exists())

    def test_create_task_reference_is_generated(self):
        self.authenticate(self.creator_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        task = Task.objects.get(id=response.data["id"])
        self.assertIsNotNone(task.reference)
        self.assertTrue(task.reference.startswith("TSK"))

    def test_create_task_default_status_is_backlog(self):
        """When no status is provided, it should default to backlog."""
        self.authenticate(self.creator_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.status, "backlog")

    def test_create_task_created_by_set_from_request_user(self):
        """created_by is inherited from CommonField and set to the requesting User."""
        self.authenticate(self.creator_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.created_by, self.creator_user)

    def test_create_task_reported_by_auto_set_from_request_user(self):
        """reported_by should be automatically set to the requesting user's ProjectMember."""
        self.authenticate(self.creator_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.reported_by, self.creator_member)

    def test_create_task_project_set_from_url(self):
        """project should come from the URL, not from the request body."""
        self.authenticate(self.creator_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.project, self.project)

    def test_create_task_organisation_set_from_project(self):
        """organisation should be derived from the project, not from the client."""
        self.authenticate(self.creator_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.organisation, self.organization)

    # ==========================================================================
    # ASSIGNED TO
    # ==========================================================================

    def test_create_task_with_valid_assignee(self):
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "assigned_to": self.member.id}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.assigned_to, self.member)

    def test_create_task_without_assignee_is_allowed(self):
        self.authenticate(self.creator_user)

        response = self.client.post(self.url, self.valid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data["id"])
        self.assertIsNone(task.assigned_to)

    def test_create_task_assignee_from_different_project_rejected(self):
        """assigned_to must belong to the same project."""
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "assigned_to": self.other_project_member.id}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("assigned_to", response.data)

    # ==========================================================================
    # FIELD VALIDATION — name
    # ==========================================================================

    def test_create_task_name_required(self):
        self.authenticate(self.creator_user)

        payload = {k: v for k, v in self.valid_payload.items() if k != "name"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    def test_create_task_name_too_long(self):
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "name": "x" * 256}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("name", response.data)

    # ==========================================================================
    # FIELD VALIDATION — expected_hours
    # ==========================================================================

    def test_create_task_expected_hours_required(self):
        self.authenticate(self.creator_user)

        payload = {k: v for k, v in self.valid_payload.items() if k != "expected_hours"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expected_hours", response.data)

    def test_create_task_expected_hours_zero_rejected(self):
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "expected_hours": 0}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expected_hours", response.data)

    def test_create_task_expected_hours_negative_rejected(self):
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "expected_hours": -3}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expected_hours", response.data)

    def test_create_task_expected_hours_decimal_accepted(self):
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "expected_hours": 2.5}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ==========================================================================
    # FIELD VALIDATION — due_date
    # ==========================================================================

    def test_create_task_due_date_in_past_rejected(self):
        self.authenticate(self.creator_user)

        payload = {
            **self.valid_payload,
            "due_date": (timezone.now() - timedelta(days=1)).isoformat(),
        }
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("due_date", response.data)

    def test_create_task_due_date_now_rejected(self):
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "due_date": timezone.now().isoformat()}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("due_date", response.data)

    def test_create_task_due_date_optional(self):
        self.authenticate(self.creator_user)

        payload = {k: v for k, v in self.valid_payload.items() if k != "due_date"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ==========================================================================
    # FIELD VALIDATION — status
    # ==========================================================================

    def test_create_task_with_valid_status(self):
        """Client can supply a valid status and it should be persisted."""
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "status": "in_progress"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.status, "in_progress")

    def test_create_task_with_invalid_status_rejected(self):
        """An unrecognised status value should return a 400."""
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "status": "flying"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_create_task_all_valid_statuses_accepted(self):
        """Every status in TASK_STATUS_CHOICES should be accepted."""
        self.authenticate(self.creator_user)

        valid_statuses = [
            "backlog", "ready", "in_progress", "blocked",
            "review", "testing", "done", "deployed", "cancelled",
        ]
        for task_status in valid_statuses:
            payload = {**self.valid_payload, "status": task_status}
            response = self.client.post(self.url, payload, format="json")

            self.assertEqual(
                response.status_code,
                status.HTTP_201_CREATED,
                msg=f"Expected 201 for status '{task_status}', got {response.status_code}",
            )
            task = Task.objects.get(id=response.data["id"])
            self.assertEqual(task.status, task_status)

    def test_create_task_status_omitted_defaults_to_backlog(self):
        """Omitting status entirely should still produce a backlog task."""
        self.authenticate(self.creator_user)

        payload = {k: v for k, v in self.valid_payload.items() if k != "status"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.status, "backlog")

    # ==========================================================================
    # IMMUTABLE FIELDS — client cannot override server-set values
    # ==========================================================================

    def test_create_task_client_cannot_override_created_by(self):
        """created_by must always be the authenticated User from CommonField."""
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "created_by": self.member.id}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.created_by, self.creator_user)

    def test_create_task_client_cannot_override_project(self):
        """project must always come from the URL parameter."""
        self.authenticate(self.creator_user)

        payload = {**self.valid_payload, "project": str(self.other_project.id)}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.project, self.project)

    def test_create_task_client_cannot_override_organisation(self):
        """organisation must always be derived from the project."""
        self.authenticate(self.creator_user)

        other_org = Organization.objects.create(
            name="Other Org",
            country="Kenya",
            created_by=self.creator_user,
        )
        payload = {**self.valid_payload, "organisation": str(other_org.id)}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.organisation, self.organization)

    # ==========================================================================
    # DESCRIPTION
    # ==========================================================================

    def test_create_task_description_optional(self):
        self.authenticate(self.creator_user)

        payload = {k: v for k, v in self.valid_payload.items() if k != "description"}
        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data["id"])
        self.assertEqual(task.description, "")