from django.utils.translation import gettext_lazy as _

LANGUAGE_CHOICES = (
    ("en", _("English")),
    ("ja", _("Japanese")),
)

ROLE_CHOICES = [
    ("admin", _("Admin")),
    ("member", _("Member")),
]