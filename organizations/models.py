import uuid
from django.conf import settings
from django.db import models

from core.models.base import CommonField
from core.models.constants import LANGUAGE_CHOICES, ROLE_CHOICES
from core.utils import generate_reference

User = settings.AUTH_USER_MODEL


class Organization(CommonField):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    reference = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
    )

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    type = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    email = models.EmailField(blank=True)
    country = models.CharField(max_length=100, blank=True)

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(
                prefix="ORG",
                entity_uuid=self.id,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.reference})"


class Membership(CommonField):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    reference = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default="member",
    )

    preferred_language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default="en",
    )

    display_name = models.CharField(max_length=255, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)

    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        unique_together = ("user", "organization")
        indexes = [
            models.Index(fields=["user", "organization"]),
        ]

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(
                prefix="MBS",
                entity_uuid=self.id,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} @ {self.organization}"
