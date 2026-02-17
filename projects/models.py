import uuid
from django.db import models
from django.conf import settings

from core.models.base import CommonField
from core.models.constants import PROJECT_STATUS_CHOICES, PROJECT_VISIBILITY_CHOICES
from core.utils import generate_reference
from organizations.models import Membership, Organization


class Project(CommonField):
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

    description = models.TextField(
        blank=True,
        help_text="Optional detailed description of the project."
    )

    status = models.CharField(
        max_length=20,
        choices=PROJECT_STATUS_CHOICES,
        default="active",
        help_text="Current lifecycle state of the project (e.g. active, archived, completed)."
    )

    visibility = models.CharField(
        max_length=20,
        choices=PROJECT_VISIBILITY_CHOICES,
        default="team",
        help_text="Controls who can see this project (e.g. only team members or entire organization)."
    )

    start_date = models.DateField(
        null=True,
        blank=True,
        help_text="Planned start date of the project."
    )

    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="Planned end date of the project."
    )

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="projects",
        help_text="Organization that owns this project."
    )

    owner = models.ForeignKey(
        Membership,
        on_delete=models.CASCADE,
        related_name="projects",
        help_text="Primary owner responsible for this project."
    )


    class Meta:
        db_table = "projects"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(
                prefix="PJT",
                entity_uuid=self.id,
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
