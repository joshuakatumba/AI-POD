from django.contrib import admin
from .models import Organization, Membership

admin.site.register(Organization)

@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "user",
        "organization",
        "display_name",
        "is_active",
        "role",
    )
    search_fields = ("display_name", "reference")
    ordering = ("-created_at",)
