from rest_framework import serializers
from organizations.models import Organization, Membership
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from projects.models import Project
from tasks.models import Task

from django.contrib.auth import get_user_model

User = get_user_model()


from sysadmin.models import AIModel, AIWorkflow

# ---------- System Admin List Organisations Serializer ----------
class AdminOrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.IntegerField(read_only=True)
    creator = serializers.SerializerMethodField()
    memberships = serializers.SerializerMethodField()

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
            "memberships",
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

    def get_memberships(self, obj):
        memberships = getattr(obj, "prefetched_memberships", [])

        return [
            {
                "id": str(m.id),
                "display_name": m.display_name,
                "email": m.user.email,
                "is_active": m.is_active,
                "role": m.role,
            }
            for m in memberships
        ]
    
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


# ---------- Admin Users Serializer ----------
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


class SysAdminUserUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "is_active",
            "is_staff",
            "is_superuser",
        ]

    def update(self, instance, validated_data):
        request_user = self.context["request"].user

        # Prevent self-lockout
        if instance == request_user:
            if "is_active" in validated_data:
                raise serializers.ValidationError("You cannot deactivate your own account.")
            if "is_staff" in validated_data:
                raise serializers.ValidationError("You cannot remove your own admin privileges.")
            if "is_superuser" in validated_data:
                raise serializers.ValidationError("You cannot remove your own superuser privileges.")

        # Prevent accidentally removing superuser from other users (optional)
        if instance.is_superuser and not request_user.is_superuser:
            raise serializers.ValidationError("Only a superuser can modify another superuser's account.")

        # Update allowed fields
        for field in ["is_active", "is_staff", "is_superuser"]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])

        instance.save()
        return instance


# ---------- Admin AI Models Serializer ----------
class AIModelCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = ["name", "provider", "api_key"]

    def create(self, validated_data):
        request = self.context["request"]
        return AIModel.objects.create(**validated_data, created_by=request.user,)


class AIModelUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = ["name", "provider", "api_key", "is_active"]


class AIModelUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False)
    provider = serializers.CharField(required=False)
    api_key = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = AIModel
        fields = ["name", "provider", "api_key", "is_active"]

class AIModelDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIModel
        fields = [
            "id",
            "reference",
            "name",
            "provider",
            "is_active",
            "created_at",
            "modified_at",
        ]


class AIModelsUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False)
    provider = serializers.CharField(required=False)
    api_key = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = AIModel
        fields = [
            "name",
            "provider",
            "api_key",
            "is_active",
        ]

    def validate_name(self, value):
        return value.strip()

    def validate_provider(self, value):
        return value.strip()

    def validate_api_key(self, value):
        if value is None:
            return value
        return value.strip()


# ---------- Admin AI Workflows Serializer ----------
class AIWorkflowCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIWorkflow
        fields = [
            "name",
            "description",
            "category",
            "system_prompt",
            "ai_model",
        ]

    def create(self, validated_data):
        request = self.context["request"]
        return AIWorkflow.objects.create(**validated_data, created_by=request.user,)


class AIWorkflowDetailSerializer(serializers.ModelSerializer):
    ai_model_name = serializers.CharField(source="ai_model.name", read_only=True)

    class Meta:
        model = AIWorkflow
        fields = [
            "id",
            "reference",
            "name",
            "description",
            "category",
            "system_prompt",
            "ai_model",
            "ai_model_name",
            "is_active",
            "created_at",
            "modified_at",
        ]


class AIWorkflowUpdateSerializer(serializers.ModelSerializer):
    name = serializers.CharField(required=False)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    category = serializers.CharField(required=False)
    system_prompt = serializers.CharField(required=False)
    ai_model = serializers.PrimaryKeyRelatedField(queryset=AIModel.objects.filter(is_deleted=False), required=False)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = AIWorkflow
        fields = [
            "name",
            "description",
            "category",
            "system_prompt",
            "ai_model",
            "is_active",
        ]
