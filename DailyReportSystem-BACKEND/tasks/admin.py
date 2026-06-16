from django.contrib import admin
from .models import Task, TaskComment

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["reference", "name", "status", "project", "assigned_to", "due_date"]
    list_filter = ["status", "project"]
    search_fields = ["reference", "name"]
    readonly_fields = ["id", "reference", "created_at", "closed_at"]

@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ["reference","content", "task", "membership","organisation", "created_at"]
    list_filter = ["task","organisation","membership", "created_at"]
    search_fields = [
        "reference",
        "content",
        "task__reference",
        "task__name",
        "membership__reference",
    ]
    readonly_fields = ["id", "reference", "created_at", "modified_at"]
    ordering = ["-created_at"]
    list_select_related = ["task", "membership", "organisation"]