import uuid

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from chat.models import Session
from core.tests.utils import MockAuthMixin
from organizations.models import Organization, Membership
from projects.models import Project, Report, ReportComment

User = get_user_model()


class TestDeleteReportComment(MockAuthMixin, APITestCase):
    def setUp(self):
        self.client.raise_request_exception = False

        self.author_user = User.objects.create_user(email="author@example.com", password="pass")
        self.comment_author_user = User.objects.create_user(email="member@example.com", password="pass")
        self.other_member_user = User.objects.create_user(email="othermember@example.com", password="pass")
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
            user=self.comment_author_user,
            organization=self.org,
            role="member",
            display_name="Comment Author",
            created_by=self.author_user,
        )
        self.other_member_membership = Membership.objects.create(
            user=self.other_member_user,
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

        self.comment = ReportComment.objects.create(
            report=self.report,
            content="Comment to delete",
            organisation=self.org,
            membership=self.member_membership,
            created_by=self.comment_author_user,
        )

        self.url = reverse(
            "reports:report_comment_detail",
            kwargs={"report_id": self.report.id, "comment_id": self.comment.id},
        )
        self.list_url = reverse(
            "reports:report_comments",
            kwargs={"report_id": self.report.id},
        )

        self.author_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.author_membership.id),
        }
        self.member_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.member_membership.id),
        }
        self.other_member_auth = {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.other_member_membership.id),
        }
        self.outsider_auth = {
            "organisation_id": str(self.other_org.id),
            "membership_id": str(self.outsider_membership.id),
        }

    def test_delete_comment_requires_authentication(self):
        response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_comment_outsider_org_returns_not_found(self):
        self.client.force_authenticate(self.outsider_user)
        with self.mock_auth(self.outsider_auth):
            response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_comment_author_can_delete(self):
        self.client.force_authenticate(self.comment_author_user)
        with self.mock_auth(self.member_auth):
            response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Comment successfully removed from report.")
        self.assertEqual(response.data["comment_id"], str(self.comment.id))
        self.assertEqual(response.data["removed_by"], self.comment_author_user.email)
        self.comment.refresh_from_db()
        self.assertTrue(self.comment.is_deleted)
        self.assertFalse(self.comment.is_active)
        self.assertIsNotNone(self.comment.is_deleted_at)
        self.assertEqual(self.comment.is_deleted_by_email, self.comment_author_user.email)
        self.assertEqual(self.comment.is_deleted_reason, "Removed by author")

        with self.mock_auth(self.member_auth):
            list_response = self.client.get(self.list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        returned = {item["id"]: item for item in list_response.data}
        self.assertIn(str(self.comment.id), returned)
        self.assertTrue(returned[str(self.comment.id)]["is_deleted"])

    def test_delete_comment_org_admin_can_delete(self):
        self.client.force_authenticate(self.author_user)
        with self.mock_auth(self.author_auth):
            response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "Comment successfully removed from report.")
        self.assertEqual(response.data["comment_id"], str(self.comment.id))
        self.assertEqual(response.data["removed_by"], self.author_user.email)
        self.comment.refresh_from_db()
        self.assertTrue(self.comment.is_deleted)
        self.assertFalse(self.comment.is_active)
        self.assertIsNotNone(self.comment.is_deleted_at)
        self.assertEqual(self.comment.is_deleted_by_email, self.author_user.email)
        self.assertEqual(self.comment.is_deleted_reason, "Removed by admin")

    def test_delete_comment_non_author_non_admin_forbidden(self):
        self.client.force_authenticate(self.other_member_user)
        with self.mock_auth(self.other_member_auth):
            response = self.client.delete(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.comment.refresh_from_db()
        self.assertFalse(self.comment.is_deleted)

    def test_delete_comment_not_found(self):
        self.client.force_authenticate(self.comment_author_user)
        with self.mock_auth(self.member_auth):
            url = reverse(
                "reports:report_comment_detail",
                kwargs={"report_id": self.report.id, "comment_id": uuid.uuid4()},
            )
            response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
