from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

User = settings.AUTH_USER_MODEL


class CommonField(models.Model):
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
    )
    created_at = models.DateTimeField(_("created_at"), auto_now_add=True)
    modified_at = models.DateTimeField(_("modified_at"), auto_now=True)
    is_active = models.BooleanField(_("is_active"), default=True)
    is_deleted = models.BooleanField(_("is_deleted"), default=False)
    is_archived = models.BooleanField(_("is_archived"), default=False)
    is_archived_at = models.DateTimeField(
        _("is_archived_at"),
        null=True,
        blank=True,
    )
    is_deleted_at = models.DateTimeField(_("is_deleted_at"), null=True, blank=True)
    is_archived_reason = models.TextField(
        _("is_archived_reason"),
        default="",
        blank=True,
    )
    is_deleted_reason = models.TextField(_("is_deleted_reason"), default="", blank=True)
    is_archived_by_email = models.CharField(
        _("is_archived_by"),
        max_length=100,
        default="",
        blank=True,
    )
    is_deleted_by_email = models.CharField(
        _("is_deleted_by"),
        max_length=100,
        default="",
        blank=True,
    )

    class Meta:
        abstract = True

