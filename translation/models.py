import uuid

from django.db import models

from core.models.base import CommonField
from core.models.constants import LANGUAGE_CHOICES, TRANSLATION_SCOPE_CHOICES
from core.utils import generate_reference

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

    scope = models.CharField(
        max_length=20,
        choices=TRANSLATION_SCOPE_CHOICES,
        db_index=True,
        help_text="Type of entity being translated.",
    )

    scope_id = models.UUIDField(
        db_index=True,
        help_text="UUID of the translated entity.",
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
            models.Index(fields=["scope", "scope_id"]),
            models.Index(fields=["source_language", "target_language"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["scope", "scope_id", "field_name", "target_language"],
                name="uniq_translation_scope_field_target_lang",
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
        return f"{self.scope}: {self.field_name} ({self.target_language})"
