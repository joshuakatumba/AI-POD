from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import MockAuthMixin
from organizations.models import Organization, Membership
from projects.models import Project, Report
from chat.models import Session

User = get_user_model()


class TestInvalidateReport(MockAuthMixin, APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_user(email="admin@example.com", password="pass")
        self.member_user = User.objects.create_user(email="member@example.com", password="pass")

        self.org = Organization.objects.create(name="Tech Corp", created_by=self.admin_user)
        self.other_org = Organization.objects.create(name="Other Corp", created_by=self.admin_user)

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

        self.project = Project.objects.create(
            name="Test Project",
            organization=self.org,
            owner=self.admin_membership,
            created_by=self.admin_user,
        )
        self.other_org_project = Project.objects.create(
            name="Other Org Project",
            organization=self.other_org,
            owner=self.other_membership,
            created_by=self.admin_user,
        )

        self.admin_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.admin_membership.id),
        }
        self.member_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.member_membership.id),
        }

        self.report = self.create_report()
        self.url = reverse("reports:report_invalidate", kwargs={"report_id": self.report.id})

    def create_session(self, membership=None, organisation=None, project=None):
        return Session.objects.create(
            title="Test Session",
            membership=membership or self.admin_membership,
            organisation=organisation or self.org,
            project=project or self.project,
            status="ingesting",
            created_by=self.admin_user,
        )

    def create_report(self, session=None, project=None, membership=None, organisation=None, deleted=False):
        session = session or self.create_session()
        return Report.objects.create(
            session=session,
            project=project or session.project,
            membership=membership or session.membership,
            organisation=organisation or session.organisation,
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

    def test_invalidate_report_returns_200(self):
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report.refresh_from_db()
        self.assertTrue(self.report.is_deleted)
        self.assertEqual(self.report.status, "invalid")

    def test_invalidate_report_response_shape(self):
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("detail", response.data)
        self.assertIn("report_id", response.data)
        self.assertIn("invalidated_by", response.data)
        self.assertEqual(response.data["report_id"], str(self.report.id))
        self.assertEqual(response.data["invalidated_by"], self.admin_user.email)

    def test_invalidate_report_records_deleted_by_email(self):
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            self.client.delete(self.url)

        self.report.refresh_from_db()
        self.assertEqual(self.report.is_deleted_by_email, self.admin_user.email)

    def test_invalidate_report_records_deleted_at(self):
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            self.client.delete(self.url)

        self.report.refresh_from_db()
        self.assertIsNotNone(self.report.is_deleted_at)

    def test_invalidate_report_unauthenticated(self):
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalidate_report_not_found(self):
        import uuid
        url = reverse("reports:report_invalidate", kwargs={"report_id": uuid.uuid4()})
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalidate_already_invalid_report_returns_400(self):
        self.report.status = "invalid"
        self.report.save()

        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_invalidate_report_scoped_to_org(self):
        other_session = self.create_session(
            membership=self.other_membership,
            organisation=self.other_org,
            project=self.other_org_project,
        )
        other_report = self.create_report(
            session=other_session,
            organisation=self.other_org,
            membership=self.other_membership,
            project=self.other_org_project,
        )
        url = reverse("reports:report_invalidate", kwargs={"report_id": other_report.id})

        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalidate_report_excluded_from_list(self):
        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            self.client.delete(self.url)

        list_url = reverse("reports:reports")
        with self.mock_auth(self.admin_auth):
            response = self.client.get(list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report_ids = [r["id"] for r in response.data["results"]]
        self.assertNotIn(str(self.report.id), report_ids)

    def test_invalidate_already_deleted_report_returns_404(self):
        deleted_report = self.create_report(deleted=True)
        url = reverse("reports:report_invalidate", kwargs={"report_id": deleted_report.id})

        self.client.force_authenticate(self.admin_user)
        with self.mock_auth(self.admin_auth):
            response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_member_can_invalidate_own_report(self):
        session = self.create_session(membership=self.member_membership)
        report = self.create_report(session=session, membership=self.member_membership)
        url = reverse("reports:report_invalidate", kwargs={"report_id": report.id})

        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertTrue(report.is_deleted)
        self.assertEqual(report.status, "invalid")