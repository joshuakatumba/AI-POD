from django.contrib import admin

from projects.models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "name",
        "organization",
        "owner",
        "status",
        "visibility",
        "start_date",
        "end_date",
    )
    list_filter = ("status", "visibility", "organization")
    search_fields = ("name", "reference")
    ordering = ("-created_at",)
