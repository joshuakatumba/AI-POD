from django.contrib import admin
from translation.models import Translation

@admin.register(Translation)
class TranslationAdmin(admin.ModelAdmin):
	list_display = (
		"reference",
		"field_name",
		"project",
		"task",
		"source_language",
		"target_language",
		"created_at",
	)
	list_filter = ("source_language", "target_language", "project", "task")
	ordering = ("-created_at",)
	readonly_fields = ("id", "reference", "created_at", "modified_at")
