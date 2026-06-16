from django.contrib import admin
from chat.models import Session


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("reference", "title", "session_type", "status", "organisation", "project", "workflow", "created_at", "modified_at",)
    list_filter = ("session_type", "status", "organisation", "project",)
    search_fields = ("reference",)
    readonly_fields = ("id", "reference", "created_at", "modified_at",)
    ordering = ("-modified_at",)
