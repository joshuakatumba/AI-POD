from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
import uuid

from core.tests.utils import MockAuthMixin
from organizations.models import Organization, Membership
from projects.models import Project, Report
from chat.models import Session

User = get_user_model()


class TestReportDetail(MockAuthMixin, APITestCase):
    def setUp(self):
        # 1. Setup Users
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
        self.other_membership = Membership.objects.create(
            user=self.member_user,
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

        # 5. Setup Session
        self.session = Session.objects.create(
            title="Test Session",
            organisation=self.org,
            membership=self.admin_membership,
            created_by=self.admin_user,
        )

        # 6. Setup Report
        self.report = Report.objects.create(
            session=self.session,
            project=self.project,
            membership=self.admin_membership,
            organisation=self.org,
            generated_text="# Test Report\n\nSome generated content.",
            structured_data_snapshot={
                "summary": {
                    "completed": ["Task A"],
                    "in_progress": ["Task B"],
                    "next_steps": [],
                    "blockers": [],
                }
            },
            created_by=self.admin_user,
        )

        # 7. Auth payloads
        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id),
        }

    # --- Helpers ---
    def get_url(self, report_id=None):
        return reverse(
            "reports:report_detail",
            kwargs={
                "report_id": report_id or self.report.id,
            },
        )

    def create_session(self, title="Test Session", org=None, membership=None):
        return Session.objects.create(
            title=title,
            organisation=org or self.org,
            membership=membership or self.admin_membership,
            created_by=self.admin_user,
        )

    def get_report(self, report_id=None, auth=None):
        url = self.get_url(report_id)
        if auth:
            self.client.force_authenticate(auth.get("user", self.admin_user))
            with self.mock_auth(auth):
                return self.client.get(url)
        return self.client.get(url)

    def patch_report(self, data, report_id=None, auth=None):
        url = self.get_url(report_id)
        if auth:
            self.client.force_authenticate(auth.get("user", self.admin_user))
            with self.mock_auth(auth):
                return self.client.patch(url, data, format="json")
        return self.client.patch(url, data, format="json")

    # --- GET Tests ---

    def test_get_report_returns_200(self):
        """GET returns 200 for authenticated user."""
        response = self.get_report(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_report_unauthenticated(self):
        """GET returns 401 if unauthenticated."""
        response = self.get_report()
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_report_not_found(self):
        """GET returns 404 for non-existent report."""
        url = reverse(
            "reports:report_detail",
            kwargs={"report_id": uuid.uuid4()},
        )
        self.client.force_authenticate(self.admin_auth.get("user", self.admin_user))
        with self.mock_auth(self.admin_auth):
            response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_report_not_found(self):
        """PATCH returns 404 for non-existent report."""
        url = reverse(
            "reports:report_detail",
            kwargs={"report_id": uuid.uuid4()},
        )
        self.client.force_authenticate(self.admin_auth.get("user", self.admin_user))
        with self.mock_auth(self.admin_auth):
            response = self.client.patch(url, {"generated_text": "Ghost update."}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_report_excluded_if_deleted(self):
        """GET returns 404 if report is soft deleted."""
        self.report.is_deleted = True
        self.report.save()

        response = self.get_report(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_report_scoped_to_org(self):
        """GET returns 404 if report belongs to a different org."""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.other_org,
            owner=self.other_membership,
            created_by=self.admin_user,
        )
        other_session = self.create_session(
            title="Other Session",
            org=self.other_org,
            membership=self.other_membership,
        )
        other_report = Report.objects.create(
            session=other_session,
            project=other_project,
            membership=self.other_membership,
            organisation=self.other_org,
            generated_text="Other org report.",
            structured_data_snapshot={},
            created_by=self.admin_user,
        )

        response = self.get_report(report_id=other_report.id, auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_report_response_shape(self):
        """GET returns correct fields on the report."""
        response = self.get_report(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

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

    def test_get_report_correct_data(self):
        """GET returns the correct report data."""
        response = self.get_report(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data["id"], str(self.report.id))
        self.assertEqual(data["reference"], self.report.reference)
        self.assertEqual(data["generated_text"], self.report.generated_text)
        self.assertEqual(data["project"]["id"], str(self.project.id))
        self.assertEqual(data["project"]["name"], self.project.name)
        self.assertEqual(data["membership"]["id"], str(self.admin_membership.id))
        self.assertEqual(data["membership"]["email"], self.admin_user.email)
        self.assertEqual(data["organisation"]["id"], str(self.org.id))
        self.assertEqual(data["organisation"]["name"], self.org.name)

    def test_get_report_tasks_is_list(self):
        """GET returns report_tasks as a list."""
        response = self.get_report(auth=self.admin_auth)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data["report_tasks"], list)

    # --- PATCH Tests ---

    def test_patch_report_generated_text(self):
        """PATCH updates generated_text successfully."""
        response = self.patch_report(
            data={"generated_text": "# Updated Report\n\nNew content."},
            auth=self.admin_auth,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report.refresh_from_db()
        self.assertEqual(self.report.generated_text, "# Updated Report\n\nNew content.")

    def test_patch_report_structured_data_snapshot(self):
        """PATCH updates structured_data_snapshot successfully."""
        new_snapshot = {
            "summary": {
                "completed": ["New Task"],
                "in_progress": [],
                "next_steps": ["Another Task"],
                "blockers": [],
            }
        }
        response = self.patch_report(
            data={"structured_data_snapshot": new_snapshot},
            auth=self.admin_auth,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report.refresh_from_db()
        self.assertEqual(self.report.structured_data_snapshot, new_snapshot)

    def test_patch_report_returns_full_detail(self):
        """PATCH returns the full report detail shape after update."""
        response = self.patch_report(
            data={"generated_text": "Updated."},
            auth=self.admin_auth,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertIn("id", data)
        self.assertIn("reference", data)
        self.assertIn("session", data)
        self.assertIn("project", data)
        self.assertIn("membership", data)
        self.assertIn("organisation", data)
        self.assertIn("generated_text", data)
        self.assertIn("structured_data_snapshot", data)
        self.assertIn("report_tasks", data)

    def test_patch_report_partial_update(self):
        """PATCH with only one field should not wipe other fields."""
        original_snapshot = self.report.structured_data_snapshot

        response = self.patch_report(
            data={"generated_text": "Only updating text."},
            auth=self.admin_auth,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report.refresh_from_db()
        self.assertEqual(self.report.structured_data_snapshot, original_snapshot)

    def test_patch_report_unauthenticated(self):
        """PATCH returns 401 if unauthenticated."""
        response = self.patch_report(data={"generated_text": "Unauthorized update."})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_report_not_found(self):
        """PATCH returns 404 for non-existent report."""
        response = self.patch_report(
            data={"generated_text": "Ghost update."},
            report_id=uuid.uuid4(),
            auth=self.admin_auth,
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_report_readonly_fields_ignored(self):
        """PATCH should ignore attempts to change read-only fields like reference."""
        original_reference = self.report.reference
        response = self.patch_report(
            data={"reference": "FAKE-REF", "generated_text": "Updated."},
            auth=self.admin_auth,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report.refresh_from_db()
        self.assertEqual(self.report.reference, original_reference)