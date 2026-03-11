from django.contrib import admin

from sysadmin.models import AIModel


@admin.register(AIModel)
class AIModelAdmin(admin.ModelAdmin):
    list_display = ("reference", "name", "provider", "is_active")