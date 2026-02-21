from django.utils.translation import gettext_lazy as _

LANGUAGE_CHOICES = (
    ("en", _("English")),
    ("ja", _("Japanese")),
)

ROLE_CHOICES = [
    ("admin", _("Admin")),
    ("member", _("Member")),
]

PROJECT_STATUS_CHOICES = [
    ("pending", _("Pending")),
    ("inactive", _("Inactive")),
    ("active", _("Active")),
    ("paused", _("Paused")),
    ("completed", _("Completed")),
    ("cancelled", _("Cancelled")),
]

PROJECT_VISIBILITY_CHOICES = [
    ("team", _("Team")),
    ("organisation", _("Organisation")),
]

PROJECT_MEMBER_ROLE_CHOICES = [
    ("contributor", _("Contributor")),
    ("admin", _("Admin")),
]

PROJECT_MEMBER_STATUS_CHOICES = [
    ("active", _("Active")),
    ("pending", _("Pending")),
    ("inactive", _("Inactive")),
]

TASK_STATUS_CHOICES = [
    ("backlog", _("Backlog")),
    ("ready", _("Ready")),
    ("in_progress", _("In Progress")),
    ("blocked", _("Blocked")),
    ("review", _("Review")),
    ("testing", _("Testing")),
    ("done", _("Done")),
    ("deployed", _("Deployed")),
    ("cancelled", _("Cancelled")),
]
