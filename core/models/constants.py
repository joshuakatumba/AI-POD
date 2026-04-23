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
    ("closed", _("Closed")),
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
    ("closed", _("Closed")),
]

AI_PROVIDER_CHOICES = [
    ("openai", _("OpenAI")),
    ("anthropic", _("Anthropic")),
    ("cohere", _("Cohere")),
    ("gemini", _("Gemini")),
    ("local", _("Local")),
]

AI_WORKFLOW_CATEGORY_CHOICES = [
    ("requirements", _("Requirements")),
    ("report", _("Report")),
    ("translation", _("Translation")),
]

SESSION_STATUS_CHOICES = [
    ("ingesting", _("Ingesting")),
    ("interviewing", _("Interviewing")),
    ("drafting", _("Drafting")),
    ("review", _("Review")),
    ("archived", _("Archived")),        
]

SESSION_TYPE_CHOICES = [
    ("report_generation", _("Report Generation")),
    ("project_audit", _("Admin Project Audit")),   
]

SESSION_MESSAGE_ROLE_CHOICES = [
    ("user", _("User")),
    ("assistant", _("Assistant")),   
    ("system", _("System")),   
    ("tool", _("Tool Call/Result")),   
]

NOTIFICATION_TYPE_CHOICES = [
    ("password_reset", _("Password Reset")),
]

NOTIFICATION_CATEGORY_CHOICES = [
    ("email", _("Email")),
    ("push", _("Push")),
    ("in_app", _("In App")),
]

NOTIFICATION_STATUS_CHOICES = [
    ("pending", _("Pending")),
    ("sent", _("Sent")),
    ("failed", _("Failed")),
]

NOTIFICATION_SCOPE_CHOICES = [
    ("user", _("User")),
    ("organization", _("Organization")),
    ("all_users", _("All Users")),
]
