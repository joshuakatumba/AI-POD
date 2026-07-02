from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from chat.models import Session
from core.tests.utils import MockAuthMixin
from organizations.models import Membership, Organization
from projectMembers.models import ProjectMember
from projects.models import Project, Report, ReportTask
from sysadmin.models import AIModel, AIWorkflow
from tasks.models import Task

User = get_user_model()


class SessionFilterTests(MockAuthMixin, APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="filter-user@test.com", password="pass")
        self.org = Organization.objects.create(name="Filter Org", created_by=self.user)
        self.membership = Membership.objects.create(
            user=self.user,
            organization=self.org,
            role="admin",
            created_by=self.user,
        )
        self.project = Project.objects.create(
            name="Filter Project",
            organization=self.org,
            owner=self.membership,
            created_by=self.user,
        )
        self.ai_model = AIModel.objects.create(
            name="gpt-4o-mini",
            provider="openai",
            api_key="test-api-key",
            created_by=self.user,
        )
        self.workflow = AIWorkflow.objects.create(
            name="Report Workflow",
            category="report",
            system_prompt="You are helpful.",
            ai_model=self.ai_model,
            created_by=self.user,
        )
        self.sessions_url = "/api/chat/"

    def authenticate(self):
        self.client.force_authenticate(user=self.user)

    def _auth_payload(self):
        return {
            "organisation_id": str(self.org.id),
            "membership_id": str(self.membership.id),
        }

    def _create_session(self, session_type="report_generation", user=None):
        """Helper to create a session."""
        return Session.objects.create(
            created_by=user or self.user,
            organisation=self.org,
            membership=self.membership,
            project=self.project,
            workflow=self.workflow,
            session_type=session_type,
            status="ingesting",
            title="Test Session",
        )

    def _create_report(self, session, report_status="draft", is_deleted=False):
        """Helper to create a report linked to a session."""
        return Report.objects.create(
            session=session,
            project=self.project,
            membership=self.membership,
            organisation=self.org,
            generated_text="Some generated text",
            structured_data_snapshot={},
            status=report_status,
            is_deleted=is_deleted,
            created_by=self.user,
        )

    def test_only_returns_sessions_with_draft_reports(self):
        """Sessions with a draft report are returned; finalized ones are excluded."""
        self.authenticate()

        draft_session = self._create_session()
        self._create_report(draft_session, report_status="draft")

        finalized_session = self._create_session()
        self._create_report(finalized_session, report_status="completed")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(draft_session.id), returned_ids)
        self.assertNotIn(str(finalized_session.id), returned_ids)

    def test_excludes_sessions_with_deleted_reports(self):
        """Sessions whose report is soft-deleted are excluded."""
        self.authenticate()

        session = self._create_session()
        self._create_report(session, report_status="draft", is_deleted=True)

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertNotIn(str(session.id), returned_ids)

    def test_excludes_sessions_with_no_report(self):
        """Sessions that have no linked report at all are excluded."""
        self.authenticate()

        session = self._create_session()  # no report created

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertNotIn(str(session.id), returned_ids)

    def test_all_org_members_can_see_all_sessions_within_organisation(self):
        """All members of an organisation can see all sessions created by any member of that organisation."""
        self.authenticate()

        other_user = User.objects.create_user(email="other@test.com", password="pass")
        other_membership = Membership.objects.create(
            user=other_user,
            organization=self.org,
            role="member",
            created_by=self.user,
        )

        session_by_user1 = self._create_session(user=self.user)
        self._create_report(session_by_user1, report_status="draft")

        session_by_user2 = self._create_session(user=other_user)
        self._create_report(session_by_user2, report_status="draft")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(session_by_user1.id), returned_ids)
        self.assertIn(str(session_by_user2.id), returned_ids)

    def test_report_status_filter_narrows_results(self):
        """Passing ?report_status=draft returns only sessions with that report status."""
        self.authenticate()

        draft_session = self._create_session()
        self._create_report(draft_session, report_status="draft")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url, {"report_status": "draft"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(draft_session.id), returned_ids)

    def test_report_status_filter_excludes_non_matching(self):
        """Passing ?report_status=completed excludes draft sessions."""
        self.authenticate()

        draft_session = self._create_session()
        self._create_report(draft_session, report_status="draft")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url, {"report_status": "completed"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertNotIn(str(draft_session.id), returned_ids)

    def test_no_report_status_filter_returns_all_default_sessions(self):
        """Omitting report_status returns all sessions (scoped to draft reports by default)."""
        self.authenticate()

        session_one = self._create_session()
        self._create_report(session_one, report_status="draft")

        session_two = self._create_session()
        self._create_report(session_two, report_status="draft")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(session_one.id), returned_ids)
        self.assertIn(str(session_two.id), returned_ids)

    def test_session_type_filter_returns_matching_sessions(self):
        """Passing ?session_type=report_generation returns only sessions of that type."""
        self.authenticate()

        report_session = self._create_session(session_type="report_generation")
        self._create_report(report_session, report_status="draft")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url, {"session_type": "report_generation"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(report_session.id), returned_ids)

    def test_session_type_filter_excludes_non_matching(self):
        """Passing ?session_type=report_generation excludes sessions of a different type."""
        self.authenticate()

        report_session = self._create_session(session_type="report_generation")
        self._create_report(report_session, report_status="draft")

        other_session = self._create_session(session_type="project_audit")
        self._create_report(other_session, report_status="draft")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url, {"session_type": "report_generation"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(report_session.id), returned_ids)
        self.assertNotIn(str(other_session.id), returned_ids)

    def test_no_session_type_filter_returns_all_session_types(self):
        """Omitting session_type returns sessions of all types."""
        self.authenticate()

        report_session = self._create_session(session_type="report_generation")
        self._create_report(report_session, report_status="draft")

        other_session = self._create_session(session_type="project_audit")
        self._create_report(other_session, report_status="draft")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(report_session.id), returned_ids)
        self.assertIn(str(other_session.id), returned_ids)

    def test_report_status_and_session_type_filters_combined(self):
        """Both filters can be used together to narrow results precisely."""
        self.authenticate()

        target_session = self._create_session(session_type="report_generation")
        self._create_report(target_session, report_status="draft")

        other_type_session = self._create_session(session_type="project_audit")
        self._create_report(other_type_session, report_status="draft")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url, {
                "report_status": "draft",
                "session_type": "report_generation",
            })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(target_session.id), returned_ids)
        self.assertNotIn(str(other_type_session.id), returned_ids)

    def test_excludes_deleted_sessions(self):
        """Sessions marked as is_deleted=True are excluded from results."""
        self.authenticate()

        active_session = self._create_session()
        self._create_report(active_session, report_status="draft")

        deleted_session = self._create_session()
        self._create_report(deleted_session, report_status="draft")
        deleted_session.is_deleted = True
        deleted_session.save()

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(active_session.id), returned_ids)
        self.assertNotIn(str(deleted_session.id), returned_ids)

    def test_project_id_filter_narrows_results(self):
        """Passing ?project_id=<id> returns only sessions from that project."""
        self.authenticate()

        other_project = Project.objects.create(
            name="Other Project",
            organization=self.org,
            owner=self.membership,
            created_by=self.user,
        )

        session_in_main_project = self._create_session()
        self._create_report(session_in_main_project, report_status="draft")

        session_in_other_project = Session.objects.create(
            created_by=self.user,
            organisation=self.org,
            membership=self.membership,
            project=other_project,
            workflow=self.workflow,
            session_type="report_generation",
            status="ingesting",
            title="Test Session",
        )
        self._create_report(session_in_other_project, report_status="draft")

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url, {"project_id": str(self.project.id)})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(session_in_main_project.id), returned_ids)
        self.assertNotIn(str(session_in_other_project.id), returned_ids)

    def test_date_range_filter_with_created_at_gte(self):
        """Passing ?created_at__gte=<date> filters sessions created after that date."""
        from django.utils import timezone
        from datetime import timedelta

        self.authenticate()

        base_time = timezone.now()
        
        old_session = self._create_session()
        old_session.created_at = base_time - timedelta(days=5)
        old_session.save()
        self._create_report(old_session, report_status="draft")

        new_session = self._create_session()
        new_session.created_at = base_time + timedelta(days=1)
        new_session.save()
        self._create_report(new_session, report_status="draft")

        filter_date = (base_time).isoformat()

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url, {"created_at__gte": filter_date})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertNotIn(str(old_session.id), returned_ids)
        self.assertIn(str(new_session.id), returned_ids)

    def test_date_range_filter_with_created_at_lte(self):
        """Passing ?created_at__lte=<date> filters sessions created before that date."""
        from django.utils import timezone
        from datetime import timedelta

        self.authenticate()

        base_time = timezone.now()
        
        old_session = self._create_session()
        old_session.created_at = base_time - timedelta(days=5)
        old_session.save()
        self._create_report(old_session, report_status="draft")

        new_session = self._create_session()
        new_session.created_at = base_time + timedelta(days=1)
        new_session.save()
        self._create_report(new_session, report_status="draft")

        filter_date = (base_time).isoformat()

        with self.mock_auth(self._auth_payload()):
            response = self.client.get(self.sessions_url, {"created_at__lte": filter_date})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        returned_ids = [s["id"] for s in response.data]
        self.assertIn(str(old_session.id), returned_ids)
        self.assertNotIn(str(new_session.id), returned_ids)