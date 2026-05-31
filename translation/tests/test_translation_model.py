from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from organizations.models import Membership, Organization
from projectMembers.models import ProjectMember
from projects.models import Project
from tasks.models import Task
from translation.models import Translation

User = get_user_model()


class TranslationModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="admin@example.com",
            password="password123",
        )

        self.organization = Organization.objects.create(
            name="Acme Org",
            country="Uganda",
            created_by=self.user,
        )

        self.membership = Membership.objects.create(
            user=self.user,
            organization=self.organization,
            role="admin",
            created_by=self.user,
        )

        self.project_1 = Project.objects.create(
            name="Project One",
            organization=self.organization,
            owner=self.membership,
            created_by=self.user,
        )

        self.project_2 = Project.objects.create(
            name="Project Two",
            organization=self.organization,
            owner=self.membership,
            created_by=self.user,
        )

        self.project_member_1 = ProjectMember.objects.create(
            project=self.project_1,
            organisation=self.organization,
            membership=self.membership,
            role="admin",
            status="active",
            created_by=self.user,
        )

        self.project_member_2 = ProjectMember.objects.create(
            project=self.project_2,
            organisation=self.organization,
            membership=self.membership,
            role="admin",
            status="active",
            created_by=self.user,
        )

        self.task_1 = Task.objects.create(
            name="Task One",
            organisation=self.organization,
            project=self.project_1,
            reported_by=self.project_member_1,
            expected_hours=Decimal("2.0"),
            created_by=self.user,
        )

        self.task_2 = Task.objects.create(
            name="Task Two",
            organisation=self.organization,
            project=self.project_2,
            reported_by=self.project_member_2,
            expected_hours=Decimal("3.0"),
            created_by=self.user,
        )

    # -------------------------
    # Payload helpers (NEW SCHEMA)
    # -------------------------
    def _project_payload(self, **overrides):
        data = {
            "scope": "project",
            "scope_id": self.project_1.id,
            "field_name": "name",
            "source_language": "en",
            "target_language": "ja",
            "original_text": "How is you",
            "translated_text": "お元気ですか？",
            "intended_text": "How are you",
            "created_by": self.user,
        }
        data.update(overrides)
        return data

    def _task_payload(self, **overrides):
        data = {
            "scope": "task",
            "scope_id": self.task_1.id,
            "field_name": "name",
            "source_language": "en",
            "target_language": "ja",
            "original_text": "How is you",
            "translated_text": "お元気ですか？",
            "intended_text": "How are you",
            "created_by": self.user,
        }
        data.update(overrides)
        return data

    # -------------------------
    # Create translation tests
    # -------------------------
    def test_create_translation_with_project_scope(self):
        translation = Translation.objects.create(
            **self._project_payload(field_name="description")
        )

        self.assertIsNotNone(translation.id)
        self.assertEqual(translation.scope, "project")
        self.assertEqual(translation.scope_id, self.project_1.id)
        self.assertEqual(translation.field_name, "description")

    def test_create_translation_with_task_scope(self):
        translation = Translation.objects.create(
            **self._task_payload(field_name="summary")
        )

        self.assertEqual(translation.scope, "task")
        self.assertEqual(translation.scope_id, self.task_1.id)

    # -------------------------
    # Invalid scope tests
    # -------------------------
    def test_create_translation_with_missing_scope_fails(self):
        translation = Translation(
            **self._project_payload(scope=None, scope_id=None)
        )

        with self.assertRaises(ValidationError):
            translation.full_clean()

    def test_create_translation_with_invalid_scope_value_fails(self):
        translation = Translation(
            **self._project_payload(scope="invalid_scope")
        )

        with self.assertRaises(ValidationError):
            translation.full_clean()

    # -------------------------
    # Reference generation
    # -------------------------
    def test_reference_auto_generated(self):
        translation = Translation.objects.create(
            **self._project_payload()
        )

        self.assertIsNotNone(translation.reference)
        self.assertTrue(translation.reference.startswith("TRN"))

    # -------------------------
    # Language validation
    # -------------------------
    def test_invalid_language_choice_fails(self):
        translation = Translation(**self._project_payload(source_language="xx"))

        with self.assertRaises(ValidationError):
            translation.full_clean()

    # -------------------------
    # Unique constraint (NEW SYSTEM)
    # -------------------------
    def test_unique_constraint_scope_field_target_language(self):
        Translation.objects.create(**self._project_payload())

        with self.assertRaises(IntegrityError):
            Translation.objects.create(
                **self._project_payload(
                    original_text="Where you are going",
                    translated_text="どこへ行きますか？",
                    intended_text="Where are you going?",
                )
            )
