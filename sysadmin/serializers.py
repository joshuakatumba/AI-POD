from rest_framework import serializers
from rest_framework.permissions import BasePermission, IsAuthenticated
from organizations.models import Organization
from django.db.models import Count

# ---------- System Admin List Organisations Serializer ----------
class AdminOrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    creator = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "reference",
            "name",
            "slug",
            "type",
            "description",
            "email",
            "country",
            "member_count",
            "creator",
            "is_active",
            "is_deleted",
            "created_at",
            "modified_at",
        ]

    def get_creator(self, obj):
        membership = getattr(obj, "creator_membership", None)

        return {
            "membership_id": membership.id if membership else None,
            "display_name": membership.display_name if membership else None,
            "email": obj.created_by.email if obj.created_by else None,
        }