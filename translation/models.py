import uuid

from django.db import models
from django.db.models import Q
from core.models.base import CommonField
from core.models.constants import LANGUAGE_CHOICES
from core.utils import generate_reference
from projects.models import Project, Report
from tasks.models import Task

class Translation(CommonField):

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="System-generated unique identifier for this translation.",
    )

    reference = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
        help_text="Short unique reference code for this translation (auto-generated).",
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Project this translation belongs to, if the translated content is project-level.",
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Task this translation belongs to, if the translated content is task-level.",
    )
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Report this translation belongs to, if the translated content is report-level.",
    )
    field_name = models.CharField(
        max_length=100,
        help_text="Name of the translated field, for example title, description, or content.",
    )

    source_language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        help_text="Language code of the original text.",
    )
    target_language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        help_text="Language code of the translated text.",
    )

    original_text = models.TextField(
        help_text="Original source text before translation.",
    )
    translated_text = models.TextField(
        help_text="Final translated text stored for display or use.",
    )
    intended_text = models.TextField(
        help_text="Intended phrasing or translation guidance for the target language.",
    )


    class Meta:
        db_table = "translations"
        indexes = [
            models.Index(fields=["project_id"]),
            models.Index(fields=["task_id"]),
            models.Index(fields=["report_id"]),
            models.Index(fields=["source_language", "target_language"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["project_id", "field_name", "target_language"],
                name="uniq_translation_project_field_target_lang",
            ),
            models.UniqueConstraint(
                fields=["task_id", "field_name", "target_language"],
                name="uniq_translation_task_field_target_lang",
            ),
            models.UniqueConstraint(
                fields=["report_id", "field_name", "target_language"],
                name="uniq_translation_report_field_target_lang",
            ),
            models.CheckConstraint(
                name="translation_requires_exactly_one_scope",
                check=(
                    (
                        Q(project__isnull=False)
                        & Q(task__isnull=True)
                        & Q(report__isnull=True)
                    )
                    |
                    (
                        Q(project__isnull=True)
                        & Q(task__isnull=False)
                        & Q(report__isnull=True)
                    )
                    |
                    (
                        Q(project__isnull=True)
                        & Q(task__isnull=True)
                        & Q(report__isnull=False)
                    )
                ),
            ),
        ]

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(
                prefix="TRN",
                entity_uuid=self.id,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        if self.project:
            return f"Project translation: {self.field_name} ({self.target_language})"
        if self.task:
            return f"Task translation: {self.field_name} ({self.target_language})"
        return f"Translation: {self.field_name} ({self.target_language})"
