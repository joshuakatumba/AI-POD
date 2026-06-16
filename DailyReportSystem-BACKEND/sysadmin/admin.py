from django.contrib import admin

from sysadmin.models import AIModel, AIWorkflow


@admin.register(AIModel)
class AIModelAdmin(admin.ModelAdmin):
    list_display = ("reference", "name", "provider", "is_active")


@admin.register(AIWorkflow)
class AIWorkflowAdmin(admin.ModelAdmin):
    list_display = ("reference", "name", "category", "ai_model", "is_active")
