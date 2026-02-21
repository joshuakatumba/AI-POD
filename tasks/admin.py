from django.contrib import admin
from .models import Task

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["reference", "name", "status", "project", "assigned_to", "due_date"]
    list_filter = ["status", "project"]
    search_fields = ["reference", "name"]
    readonly_fields = ["id", "reference", "created_at", "closed_at"]
