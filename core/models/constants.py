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
    ("active", _("Active")),
    ("paused", _("Paused")),
    ("completed", _("Completed")),
]

PROJECT_VISIBILITY_CHOICES = [
    ("team", _("Team")),
    ("organisation", _("Organisation")),
]
