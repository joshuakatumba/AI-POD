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

    def _project_payload(self, **overrides):
        data = {
            "project": self.project_1,
            "task": None,
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
            "project": None,
            "task": self.task_1,
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

    # create translation
    def test_create_translation_with_project_only(self):
        translation = Translation.objects.create(
            **self._project_payload(field_name="description")
        )

        self.assertIsNotNone(translation.id)
        self.assertEqual(translation.project, self.project_1)
        self.assertIsNone(translation.task)
        self.assertEqual(translation.field_name, "description")

    def test_create_translation_with_task_only(self):
        translation = Translation.objects.create(
            **self._task_payload(field_name="summary")
        )

        self.assertEqual(translation.task, self.task_1)
        self.assertIsNone(translation.project)

    def test_create_translation_with_both_project_and_task_null_fails(self):
        translation = Translation(**self._project_payload(project=None, task=None))

        with self.assertRaises(ValidationError):
            translation.full_clean()

        with self.assertRaises(IntegrityError):
            Translation.objects.create(**self._project_payload(project=None, task=None))

    def test_create_translation_with_both_project_and_task_set_fails(self):
        translation = Translation(**self._task_payload(project=self.project_1, task=self.task_1))

        with self.assertRaises(ValidationError):
            translation.full_clean()

        with self.assertRaises(IntegrityError):
            Translation.objects.create(**self._task_payload(project=self.project_1, task=self.task_1))

    # reference generation
    def test_reference_auto_generated(self):
        translation = Translation.objects.create(**self._project_payload())

        self.assertIsNotNone(translation.reference)
        self.assertTrue(translation.reference.startswith("TRN"))

    # language choice validation
    def test_invalid_language_choice_fails(self):
        translation = Translation(**self._project_payload(source_language="xx"))

        with self.assertRaises(ValidationError):
            translation.full_clean()

    # unique(project, field_name, target_language)
    def test_unique_constraint_project_field_target_language(self):
        Translation.objects.create(**self._project_payload())

        with self.assertRaises(IntegrityError):
            Translation.objects.create(
                **self._project_payload(
                    original_text="Where you are going",
                    translated_text="どこへ行きますか？",
                    intended_text="Where are you going?",
                )
            )

    # unique(task, field_name, target_language)
    def test_unique_constraint_task_field_target_language(self):
        Translation.objects.create(**self._task_payload())

        with self.assertRaises(IntegrityError):
            Translation.objects.create(
                **self._task_payload(
                    original_text="Where you are going",
                    translated_text="どこへ行きますか？",
                    intended_text="Where are you going?",
                )
            )