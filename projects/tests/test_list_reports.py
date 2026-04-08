from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import MockAuthMixin
from organizations.models import Organization, Membership
from projects.models import Project, Report, ReportTask
from chat.models import Session
from tasks.models import Task
from projectMembers.models import ProjectMember

User = get_user_model()


class TestListReports(MockAuthMixin, APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(email="admin@example.com", password="pass")
        self.member_user = User.objects.create_user(email="member@example.com", password="pass")

        # 2. Setup Organizations
        self.org = Organization.objects.create(name="Tech Corp", created_by=self.admin_user)
        self.other_org = Organization.objects.create(name="Other Corp", created_by=self.admin_user)

        # 3. Setup Memberships
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.org,
            role="admin",
            display_name="Admin User",
            created_by=self.admin_user,
        )
        self.member_membership = Membership.objects.create(
            user=self.member_user,
            organization=self.org,
            role="member",
            display_name="Member User",
            created_by=self.admin_user,
        )
        self.other_membership = Membership.objects.create(
            user=self.admin_user,
            organization=self.other_org,
            role="admin",
            display_name="Other Admin",
            created_by=self.admin_user,
        )

        # 4. Setup Project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.org,
            owner=self.admin_membership,
            created_by=self.admin_user,
        )
        self.other_project = Project.objects.create(
            name="Other Project",
            organization=self.org,
            owner=self.admin_membership,
            created_by=self.admin_user,
        )

        self.url = reverse("projects:reports")

        # 6. Auth payloads
        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id),
        }
        self.member_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.member_membership.id),
        }

    def get_reports(self, auth=None, params=None):
        """Perform GET request with optional auth and query params."""
        params = params or {}
        if auth:
            self.client.force_authenticate(auth.get("user", self.admin_user))
            with self.mock_auth(auth):
                return self.client.get(self.url, params)
        return self.client.get(self.url, params)

    def create_session(
        self,
        title="Test Session",
        membership=None,
        organisation=None,
        project=None,
        status="ingesting",
    ):
        """Create a chat session for testing."""
        membership = membership or self.admin_membership
        organisation = organisation or self.org
        project = project or self.project

        return Session.objects.create(
            title=title,
            membership=membership,
            organisation=organisation,
            project=project,
            status=status,
            created_by=self.admin_user,
        )

    def create_report(self, session=None, project=None, membership=None, deleted=False):
        """Create a report for testing."""
        session = session or self.create_session()
        membership = membership or session.membership
        project = project or session.project

        return Report.objects.create(
            session=session,
            project=project,
            membership=membership,
            organisation=session.organisation,
            generated_text="# Test Report\n\nSome generated content.",
            structured_data_snapshot={
                "summary": {
                    "completed": [],
                    "in_progress": [],
                    "next_steps": [],
                    "blockers": [],
                }
            },
            created_by=self.admin_user,
            is_deleted=deleted,
        )

    # --- Tests ---

    def test_list_reports_returns_200(self):
        """GET returns 200 for authenticated user."""
        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_reports_unauthenticated(self):
        """GET returns 401 if unauthenticated."""
        response = self.get_reports()
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_reports_empty(self):
        """GET returns empty list if no reports exist."""
        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_list_reports_scoped_to_org(self):
        """GET returns only reports belonging to the org in the token."""
        self.create_report()
        self.create_report()

        # Report for other org
        other_project = Project.objects.create(
            name="Other Org Project",
            organization=self.other_org,
            owner=self.other_membership,
            created_by=self.admin_user,
        )
        Report.objects.create(
            session=self.create_session(),
            project=other_project,
            membership=self.other_membership,
            organisation=self.other_org,
            generated_text="Other org report.",
            structured_data_snapshot={},
            created_by=self.admin_user,
        )

        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_list_reports_excludes_deleted(self):
        """GET should skip reports marked as deleted."""
        self.create_report()
        self.create_report(deleted=True)

        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_list_reports_ordered_latest_first(self):
        """GET returns reports ordered by created_at descending."""
        report_a = self.create_report()
        report_b = self.create_report()

        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(results[0]["id"], str(report_b.id))
        self.assertEqual(results[1]["id"], str(report_a.id))

    def test_list_reports_response_shape(self):
        """GET returns correct top-level fields on each report."""
        self.create_report()

        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["results"][0]

        self.assertIn("id", data)
        self.assertIn("reference", data)
        self.assertIn("session", data)
        self.assertIn("project", data)
        self.assertIn("membership", data)
        self.assertIn("organisation", data)
        self.assertIn("generated_text", data)
        self.assertIn("structured_data_snapshot", data)
        self.assertIn("report_tasks", data)
        self.assertIn("created_at", data)
        self.assertIn("modified_at", data)

    def test_list_reports_membership_fields(self):
        """GET returns correct membership fields."""
        self.create_report()

        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        membership_data = response.data["results"][0]["membership"]

        self.assertEqual(membership_data["id"], str(self.admin_membership.id))
        self.assertEqual(membership_data["email"], self.admin_user.email)
        self.assertEqual(membership_data["display_name"], self.admin_membership.display_name)

    def test_list_reports_project_fields(self):
        """GET returns correct project fields."""
        self.create_report()

        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        project_data = response.data["results"][0]["project"]

        self.assertEqual(project_data["id"], str(self.project.id))
        self.assertEqual(project_data["name"], self.project.name)

    def test_list_reports_organisation_fields(self):
        """GET returns correct organisation fields."""
        self.create_report()

        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        org_data = response.data["results"][0]["organisation"]

        self.assertEqual(org_data["id"], str(self.org.id))
        self.assertEqual(org_data["name"], self.org.name)

    def test_filter_reports_by_month(self):
        """GET ?month=YYYY-MM returns only reports from that month."""
        self.create_report()

        # Force one report into a different month
        old_report = self.create_report()
        Report.objects.filter(id=old_report.id).update(
            created_at="2025-01-15T10:00:00Z"
        )

        response = self.get_reports(
            auth=self.admin_auth,
            params={"month": "2025-01"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_filter_reports_by_project(self):
        """GET ?project=<uuid> returns only reports for that project."""
        self.create_report(project=self.project)
        self.create_report(project=self.other_project)

        response = self.get_reports(
            auth=self.admin_auth,
            params={"project": str(self.project.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(
            response.data["results"][0]["project"]["id"],
            str(self.project.id),
        )

    def test_filter_reports_by_membership(self):
        """GET ?membership=<uuid> returns only reports for that member."""
        self.create_report(membership=self.admin_membership)
        self.create_report(membership=self.member_membership)

        response = self.get_reports(
            auth=self.admin_auth,
            params={"membership": str(self.admin_membership.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(
            response.data["results"][0]["membership"]["id"],
            str(self.admin_membership.id),
        )

    def test_filter_reports_invalid_month_ignored(self):
        """GET ?month=invalid should return 400 with validation error."""
        self.create_report()
        self.create_report()

        response = self.get_reports(
            auth=self.admin_auth,
            params={"month": "invalid"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("month", response.data)

    def test_list_reports_pagination(self):
        """GET should paginate reports with default page_size=10."""
        for _ in range(15):
            self.create_report()

        response = self.get_reports(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 10)
        self.assertEqual(response.data["count"], 15)
        self.assertIsNotNone(response.data["next"])
        self.assertIsNone(response.data["previous"])

        response = self.get_reports(auth=self.admin_auth, params={"page": 2})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertIsNone(response.data["next"])
        self.assertIsNotNone(response.data["previous"])

    def test_list_reports_pagination_custom_page_size(self):
        """GET should respect page_size query param."""
        for _ in range(8):
            self.create_report()

        response = self.get_reports(auth=self.admin_auth, params={"page_size": 5})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertEqual(response.data["count"], 8)
        self.assertIsNotNone(response.data["next"])