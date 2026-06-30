from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from core.tests.utils import MockAuthMixin
from organizations.models import Organization, Membership
from projects.models import Project, Report, ReportComment
from chat.models import Session

User = get_user_model()


class TestCreateReportComment(MockAuthMixin, APITestCase):
    def setUp(self):
        self.author_user = User.objects.create_user(email="author@example.com", password="pass")
        self.member_user = User.objects.create_user(email="member@example.com", password="pass")
        self.outsider_user = User.objects.create_user(email="outsider@example.com", password="pass")

        self.org = Organization.objects.create(name="Tech Corp", created_by=self.author_user)
        self.other_org = Organization.objects.create(name="Other Corp", created_by=self.outsider_user)

        self.author_membership = Membership.objects.create(
            user=self.author_user,
            organization=self.org,
            role="admin",
            display_name="Report Author",
            created_by=self.author_user,
        )
        self.member_membership = Membership.objects.create(
            user=self.member_user,
            organization=self.org,
            role="member",
            display_name="Org Member",
            created_by=self.author_user,
        )
        self.outsider_membership = Membership.objects.create(
            user=self.outsider_user,
            organization=self.other_org,
            role="member",
            display_name="Outsider",
            created_by=self.outsider_user,
        )

        self.project = Project.objects.create(
            name="Alpha Project",
            organization=self.org,
            owner=self.author_membership,
            created_by=self.author_user,
        )

        self.session = Session.objects.create(
            title="Daily standup",
            membership=self.author_membership,
            organisation=self.org,
            project=self.project,
            status="ingesting",
            created_by=self.author_user,
        )

        self.report = Report.objects.create(
            session=self.session,
            project=self.project,
            membership=self.author_membership,
            organisation=self.org,
            generated_text="# Report\n\nSome content.",
            structured_data_snapshot={"summary": {"completed": [], "blockers": []}},
            created_by=self.author_user,
        )

        self.url = reverse("reports:report_comments", kwargs={"report_id": self.report.id})

        self.author_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.author_membership.id),
        }
        self.member_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.member_membership.id),
        }
        self.outsider_auth = {
            "organisation_id": str(self.other_org.id),
            "membership_id": str(self.outsider_membership.id),
        }

    def test_create_requires_authentication(self):
        response = self.client.post(self.url, {"content": "Looks good"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_requires_org_membership(self):
        self.client.force_authenticate(self.outsider_user)
        with self.mock_auth(self.outsider_auth):
            response = self.client.post(self.url, {"content": "Sneaky comment"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_blank_content_fails(self):
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            response = self.client.post(self.url, {"content": "   "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("content", response.data)

    def test_create_missing_content_fails(self):
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("content", response.data)

    def test_create_success_sets_ownership_fields(self):
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            response = self.client.post(
                self.url, {"content": "  Great report!  "}, format="json"
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ReportComment.objects.count(), 1)

        comment = ReportComment.objects.get()
        self.assertEqual(comment.report, self.report)
        self.assertEqual(comment.content, "Great report!")
        self.assertEqual(comment.organisation, self.org)
        self.assertEqual(comment.membership, self.member_membership)
        self.assertEqual(comment.created_by, self.member_user)
        self.assertTrue(comment.reference.startswith("RCM"))

    def test_create_on_deleted_report_returns_404(self):
        self.report.is_deleted = True
        self.report.save()

        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            response = self.client.post(self.url, {"content": "Comment"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)