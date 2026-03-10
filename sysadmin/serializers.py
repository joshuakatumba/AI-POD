from rest_framework import serializers
from organizations.models import Organization, Membership
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from projects.models import Project
from tasks.models import Task

from django.contrib.auth import get_user_model

User = get_user_model()


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
    
# ---------- Admin Force Delete Organisation Serializer ----------
class AdminForceDeleteOrganizationSerializer(serializers.Serializer):
    deletion_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Optional reason for force deleting the organization"
    )

    def validate(self, attrs):
        organization = self.context["organization"]

        # Block if already deleted — even admins can't delete twice
        if organization.is_deleted:
            raise ValidationError(
                "This organization has already been deleted."
            )

        attrs["organization"] = organization
        return attrs

    @transaction.atomic
    def delete(self):
        organization = self.validated_data["organization"]
        request = self.context["request"]
        deletion_reason = self.validated_data.get("deletion_reason", "")
        deleted_at = timezone.now()

        # 1. Soft delete the organization itself
        organization.is_active = False
        organization.is_deleted = True
        organization.is_deleted_at = deleted_at
        organization.is_deleted_by = request.user
        organization.is_deleted_reason = deletion_reason
        organization.save()

        # 2. Soft delete all memberships in this org
        Membership.objects.filter(
            organization=organization,
            is_deleted=False
        ).update(
            is_active=False,
            is_deleted=True,
            is_deleted_at=deleted_at,
            is_deleted_by_email=request.user.email,
            is_deleted_reason=f"Organization force deleted by admin: {deletion_reason or 'No reason provided'}"
        )

        # 3. Soft delete all projects in this org
        Project.objects.filter(
            organization=organization,
            is_deleted=False
        ).update(
            is_active=False,
            is_deleted=True,
            is_deleted_at=deleted_at,
            is_deleted_by_email=request.user.email,
            is_deleted_reason=f"Organization force deleted by admin: {deletion_reason or 'No reason provided'}"
        )

        # 4. Soft delete all tasks in this org
        Task.objects.filter(
            organisation=organization,  # note: Task uses 'organisation' with a 'u'
            is_deleted=False
        ).update(
            is_active=False,
            is_deleted=True,
            is_deleted_at=deleted_at,
            is_deleted_by_email=request.user.email,
            is_deleted_reason=f"Organization force deleted by admin: {deletion_reason or 'No reason provided'}"
        )

        return organization


class SysAdminUserSerializer(serializers.ModelSerializer):
    memberships = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "last_login",
            "date_joined",
            "memberships",
        ]

    def get_memberships(self, obj):
        memberships = getattr(obj, "prefetched_memberships", [])

        return [
            {
                "id": str(m.id),
                "organization_id": str(m.organization_id),
                "organization_name": m.organization.name,
                "display_name": m.display_name,
                "role": m.role,
                "joined_at": m.joined_at,
                "last_accessed_at": m.last_accessed_at,
            }
            for m in memberships
        ]
