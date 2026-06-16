from django.contrib import admin
from .models import ProjectMember


@admin.register(ProjectMember)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "membership",
        "project",
        "role",
        "status",
    )
    list_filter = ("status", "role", "project")
    search_fields = ("reference",)
    ordering = ("-created_at",)
