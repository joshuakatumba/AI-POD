import uuid
from django.db import models

from core.models.base import CommonField
from core.models.constants import AI_PROVIDER_CHOICES
from core.utils import generate_reference

from django.db import models
from encrypted_model_fields.fields import EncryptedTextField  # pip install django-encrypted-model-fields
import uuid

class AIModel(CommonField):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="System-generated unique identifier for this project."
    )

    reference = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
        help_text="Short unique reference code for this project (auto-generated)."
    )

    name = models.CharField(
        max_length=255,
        help_text="Human-readable name of the project."
    )

    provider = models.CharField(max_length=50, choices=AI_PROVIDER_CHOICES)

    api_key = EncryptedTextField(blank=True, null=True, help_text="Encrypted API key for this AI provider")

    class Meta:
        ordering = ['-created_at']
        db_table = "ai_models"
        verbose_name = "AI Model"
        verbose_name_plural = "AI Models"

        constraints = [
            models.UniqueConstraint(
                fields=["name", "provider"],
                condition=models.Q(is_deleted=False),
                name="unique_active_ai_model_per_provider"
            )
        ]
    
    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(
                prefix="AIM",
                entity_uuid=self.id,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.provider})"
