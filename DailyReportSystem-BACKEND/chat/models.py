import uuid

from django.db import models
from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, UserPromptPart

from core.models.base import CommonField
from core.models.constants import SESSION_MESSAGE_ROLE_CHOICES, SESSION_STATUS_CHOICES, SESSION_TYPE_CHOICES
from core.utils import generate_reference
from sysadmin.models import AIWorkflow

class Session(CommonField):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    reference = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
    )

    title = models.CharField(max_length=255, default="New Conversation")
    session_type = models.CharField(
        max_length=20,
        choices=SESSION_TYPE_CHOICES,
        default="report_generation"
    )

    project = models.ForeignKey(
        'projects.Project', 
        on_delete=models.CASCADE, 
        related_name='sessions',
        null=True, blank=True # Nullable for general chats
    )

    workflow = models.ForeignKey(
        AIWorkflow, 
        on_delete=models.SET_NULL, 
        related_name='reports',
        null=True, blank=True # Nullable for general chats
    )
    
    title = models.CharField(max_length=255, default="New Engineering Report")
    status = models.CharField(
        max_length=20, 
        choices=SESSION_STATUS_CHOICES, 
        default="ingesting"
    )

    organisation = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name="organisation_sessions",
        help_text="Organization that owns this session."
    )

    membership = models.ForeignKey(
        'organizations.Membership',
        on_delete=models.CASCADE,
        related_name="member_sessions",
        help_text="Primary owner responsible for this session."
    )

    class Meta:
        db_table = "sessions"
        ordering = ['-modified_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(
                prefix="CHS",
                entity_uuid=self.id,
            )
        super().save(*args, **kwargs)


class SessionMessage(CommonField):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    reference = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        db_index=True,
    )

    session = models.ForeignKey(
        Session, 
        related_name='messages', 
        on_delete=models.CASCADE
    )

    organisation = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name="organisation_session_messages",
        help_text="Organization that owns this session massage."
    )

    membership = models.ForeignKey(
        'organizations.Membership',
        on_delete=models.CASCADE,
        related_name="member_session_messages",
        help_text="Primary owner responsible for this session message."
    )

    role = models.CharField(max_length=10, choices=SESSION_MESSAGE_ROLE_CHOICES)

    content = models.TextField(help_text="The raw text of the message")
    
    # Metadata for Citations and Reasoning
    # e.g., {"sources": ["task_1", "task_2"], "thought_process": "..."}
    metadata = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Stores citations, tool names, or UI-specific flags (e.g. { 'task_id': 123 })"
    )
    
    class Meta:
        db_table = "session_messages"
        ordering = ['created_at'] # Sequential order for the conversation thread
    
    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(
                prefix="CHM",
                entity_uuid=self.id,
            )
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.role} - {self.session.reference} [{self.created_at}]"
    
    def to_pydantic_ai_format(self):
        """Converts the DB record into a PydanticAI message part."""
        if self.role == 'user':
            return ModelRequest(parts=[UserPromptPart(content=self.content)])
        elif self.role == 'assistant':
            return ModelResponse(parts=[TextPart(content=self.content)])
        return None

