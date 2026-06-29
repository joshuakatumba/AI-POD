import uuid

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from chat.models import Session
from core.tests.utils import MockAuthMixin
from organizations.models import Membership, Organization
from projects.models import Project, Report, ReportComment

User = get_user_model()


class TestGetReportComment(MockAuthMixin, APITestCase):
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
        self.other_session = Session.objects.create(
            title="Weekly check-in",
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
        self.other_report = Report.objects.create(
            session=self.other_session,
            project=self.project,
            membership=self.author_membership,
            organisation=self.org,
            generated_text="# Other Report\n\nOther content.",
            structured_data_snapshot={"summary": {"completed": [], "blockers": []}},
            created_by=self.author_user,
        )

        self.comment_1 = ReportComment.objects.create(
            report=self.report,
            content="First comment",
            organisation=self.org,
            membership=self.member_membership,
            created_by=self.member_user,
        )
        self.comment_2 = ReportComment.objects.create(
            report=self.report,
            content="Second comment",
            organisation=self.org,
            membership=self.author_membership,
            created_by=self.author_user,
        )
        self.other_report_comment = ReportComment.objects.create(
            report=self.other_report,
            content="Other report comment",
            organisation=self.org,
            membership=self.author_membership,
            created_by=self.author_user,
        )

        self.list_url = reverse("reports:report_comments", kwargs={"report_id": self.report.id})
        self.detail_url = reverse(
            "reports:report_comment_detail",
            kwargs={"report_id": self.report.id, "comment_id": self.comment_1.id},
        )

        self.member_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.member_membership.id),
        }
        self.outsider_auth = {
            "organisation_id": str(self.other_org.id),
            "membership_id": str(self.outsider_membership.id),
        }

    def test_list_requires_authentication(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_requires_org_membership(self):
        self.client.force_authenticate(self.outsider_user)
        with self.mock_auth(self.outsider_auth):
            response = self.client.get(self.list_url)

        self.assertEqual(response.data, [])

    def test_list_comments_as_org_member_success(self):
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        returned_ids = {item["id"] for item in response.data}
        self.assertIn(str(self.comment_1.id), returned_ids)
        self.assertIn(str(self.comment_2.id), returned_ids)
        self.assertNotIn(str(self.other_report_comment.id), returned_ids)

    def test_list_comments_report_not_found(self):
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            url = reverse("reports:report_comments", kwargs={"report_id": uuid.uuid4()})
            response = self.client.get(url)

        self.assertEqual(response.data, [])

    def test_get_comment_as_org_member_success(self):
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(self.comment_1.id))
        self.assertEqual(response.data["content"], self.comment_1.content)
        self.assertEqual(str(response.data["report"]["id"]), str(self.report.id))

    def test_get_comment_requires_authentication(self):
        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_comment_requires_org_membership(self):
        self.client.force_authenticate(self.outsider_user)
        with self.mock_auth(self.outsider_auth):
            response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_comment_not_found(self):
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            url = reverse(
                "reports:report_comment_detail",
                kwargs={"report_id": self.report.id, "comment_id": uuid.uuid4()},
            )
            response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_comment_on_other_report_returns_not_found(self):
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            url = reverse(
                "reports:report_comment_detail",
                kwargs={"report_id": self.report.id, "comment_id": self.other_report_comment.id},
            )
            response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_response_contains_expected_fields(self):
        self.client.force_authenticate(self.member_user)
        with self.mock_auth(self.member_auth):
            response = self.client.get(self.list_url)

        task_data = response.data[0]
        expected_fields = {
            "id", "reference", "modified_at", "is_deleted_by_email", "report", "is_deleted",
            "content", "membership", "is_deleted_reason", "is_deleted_at", "translations",
            "parent", "replies", "created_by", "organisation", "created_at"
        }
        self.assertEqual(set(task_data.keys()), expected_fields)
