import uuid
from django.db import models
from django.utils import timezone

from core.models.base import CommonField
from core.models.constants import TASK_CATEGORY_CHOICES, TASK_PRIORITY_CHOICES, TASK_STATUS_CHOICES, TASK_ATTACHMENT_TYPE_CHOICES
from core.utils import generate_reference
from organizations.models import Organization
from projects.models import Project
from projectMembers.models import ProjectMember

class Task(CommonField):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, editable=False, db_index=True)

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    expected_hours = models.DecimalField(max_digits=6, decimal_places=1)
    category = models.CharField(max_length=20, choices=TASK_CATEGORY_CHOICES, default="feature")
    priority = models.CharField(max_length=20, choices=TASK_PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=20, choices=TASK_STATUS_CHOICES, default="backlog")

    organisation = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="tasks",
    )
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    reported_by = models.ForeignKey(
        ProjectMember, on_delete=models.CASCADE, related_name="reported_tasks"
    )
    assigned_to = models.ForeignKey(
        ProjectMember,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "tasks"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organisation", "status"]),
            models.Index(fields=["project", "status"]),
            models.Index(fields=["assigned_to", "status"]),
            models.Index(fields=["reported_by"]),
            models.Index(fields=["due_date"]),
        ]

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(prefix="TSK", entity_uuid=self.id)

        if self.status == "closed" and not self.closed_at:
            self.closed_at = timezone.now()
        elif self.status != "closed":
            self.closed_at = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} - {self.name}"


class TaskComment(CommonField):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, editable=False, db_index=True)
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE, 
        related_name="comments")
    content = models.TextField()
    organisation = models.ForeignKey(
        Organization, on_delete=models.CASCADE, 
        related_name="task_comments" #easier to query
    )
    membership = models.ForeignKey(
        ProjectMember, on_delete=models.CASCADE, 
        related_name="task_comments" 
    )
    
    class Meta:
        db_table = "task_comments"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["task"]),
            models.Index(fields=["organisation"]),
            models.Index(fields=["created_at"]),
        ]
        
    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(prefix="TCM", entity_uuid=self.id)
        super().save(*args, **kwargs)


class TaskAttachment(CommonField):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, editable=False, db_index=True)
    task = models.ForeignKey(
        Task, on_delete=models.CASCADE,
        related_name="attachments"
    )
    title = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TASK_ATTACHMENT_TYPE_CHOICES, default="link")
    url = models.URLField(max_length=2048)
    organisation = models.ForeignKey(
        Organization, on_delete=models.CASCADE,
        related_name="task_attachments"
    )
    membership = models.ForeignKey(
        ProjectMember, on_delete=models.CASCADE,
        related_name="task_attachments"
    )

    class Meta:
        db_table = "task_attachments"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["task", "is_deleted"])
        ]

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(prefix="TAT", entity_uuid=self.id)
        super().save(*args, **kwargs)