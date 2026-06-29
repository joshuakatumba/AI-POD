import uuid
from django.db import models
from django.conf import settings

from chat.models import Session
from core.models.base import CommonField
from core.models.constants import PROJECT_STATUS_CHOICES, PROJECT_VISIBILITY_CHOICES, REPORT_STATUS_CHOICES
from core.utils import generate_reference
from organizations.models import Membership, Organization

User = settings.AUTH_USER_MODEL

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
        default="pending",
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


class Report(CommonField):
    """
    The finalized, professional output. 
    Linked 1:1 to the conversation that generated it.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    reference = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
    )

    session = models.OneToOneField(
        "chat.Session", 
        on_delete=models.CASCADE, 
        related_name='final_report'
    )

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="reports",
    )

    membership = models.ForeignKey(
        "organizations.Membership",
        on_delete=models.CASCADE,
        related_name="reports",
    )

    organisation = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name="reports",
        help_text="Organization that owns this project."
    )
    
    # The actual "clean" content (Markdown or HTML)
    generated_text = models.TextField(
        help_text="The actual clean content (Markdown or HTML)"
    )
    
    # Snapshots for history (even if the task logs change later)
    structured_data_snapshot = models.JSONField(
        help_text="The exact technical specs at time of generation"
    )

    status = models.CharField(
        max_length=20,
        choices=REPORT_STATUS_CHOICES,
        default="draft",
        help_text="Current lifecycle state of the report (e.g. draft, complete)."
    )
    
    class Meta:
        db_table = "Reports"
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(
                prefix="ERS",
                entity_uuid=self.id,
            )
        super().save(*args, **kwargs)


class ReportTask(CommonField):
    """
    Links a Session to the specific Tasks being discussed.
    This is the AI's 'Checklist' for the current conversation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    session = models.ForeignKey(
        'chat.Session', 
        on_delete=models.CASCADE, 
        related_name='session_tasks'
    )
    # Nullable because the report is generated AFTER the session starts
    report = models.ForeignKey(
        'projects.Report', 
        on_delete=models.CASCADE, 
        related_name='report_tasks',
        null=True, 
        blank=True 
    )
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        related_name='session_links'
    )
    organisation = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name="report_tasks",
        help_text="Organization that owns this report task."
    )
    
    is_validated_by_ai = models.BooleanField(default=False)
    ai_notes = models.TextField(blank=True)

    class Meta:
        db_table = "report_tasks"
        unique_together = ('session', 'task')


class ReportComment(CommonField):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, editable=False, db_index=True)
    report = models.ForeignKey(
        Report, on_delete=models.CASCADE,
        related_name="comments",
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replies",
    )
    content = models.TextField()
    organisation = models.ForeignKey(
        Organization, on_delete=models.CASCADE,
        related_name="report_comments",
    )
    membership = models.ForeignKey(
        "organizations.Membership", on_delete=models.CASCADE,
        related_name="report_comments",
    )

    class Meta:
        db_table = "report_comments"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["report"]),
            models.Index(fields=["organisation"]),
            models.Index(fields=["created_at"]),
        ]

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(prefix="RCM", entity_uuid=self.id)
        super().save(*args, **kwargs)