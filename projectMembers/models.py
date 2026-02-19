import uuid
from django.conf import settings
from django.db import models
from core.models.constants import PROJECT_MEMBER_ROLE_CHOICES, PROJECT_MEMBER_STATUS_CHOICES
from core.models.base import CommonField
from core.utils import generate_reference

User = settings.AUTH_USER_MODEL


class ProjectMember(CommonField):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.CharField(max_length=20, unique=True, editable=False, db_index=True)

    #Link to the Project 
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="members")
    organisation = models.ForeignKey("organizations.Organization", on_delete=models.CASCADE, related_name="project_members")

    #Member details
    membership = models.ForeignKey("organizations.Membership", on_delete=models.CASCADE, related_name="project_memberships")
    role = models.CharField(max_length=20, choices=PROJECT_MEMBER_ROLE_CHOICES, default="contributor")
    status = models.CharField(max_length=20, choices=PROJECT_MEMBER_STATUS_CHOICES, default="pending")

    class Meta:
        db_table = "project_members"
        unique_together = ("project", "membership")

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = generate_reference(prefix="PMB", entity_uuid=self.id)         
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.member.display_name} ({self.member.user.email}) - {self.get_role_display()} - {self.get_status_display()}"