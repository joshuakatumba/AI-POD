from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError

from organizations.models import Organization, Membership

User = get_user_model()

# ---------- Create Organisation Serializer ----------
class OrganizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "type",
            "description",
            "email",
            "country",
        ]
        read_only_fields = ["id"]

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        user = request.user

        organization = Organization.objects.create(
            **validated_data,
            created_by=user,
        )

        Membership.objects.create(
            user=user,
            organization=organization,
            role="admin",
            created_by=user,
        )

        return organization

# ---------- Add User to Organisation Serializer ----------
class AddUserToOrganizationSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, attrs):
        request = self.context["request"]
        organization = self.context["organization"]

        # Only admins or superusers can add users
        if not request.user.is_superuser:
            is_admin = Membership.objects.filter(
                user=request.user,
                organization=organization,
                role="admin",
                is_active=True,
            ).exists()

            if not is_admin:
                raise PermissionDenied(
                    "You do not have permission to add users to this organization."
                )

        # Check user exists
        try:
            user = User.objects.get(email=attrs["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "User with this email does not exist."
            )

        # Check duplicate membership
        if Membership.objects.filter(
            user=user,
            organization=organization,
            is_active=True,
        ).exists():
            raise serializers.ValidationError(
                "User is already a member of this organization."
            )

        attrs["user"] = user
        return attrs

    def create(self, validated_data):
        organization = self.context["organization"]
        request = self.context["request"]

        return Membership.objects.create(
            user=validated_data["user"],
            organization=organization,
            role="member",
            created_by=request.user,
        )

# ---------- Organisation Membership Serializer ----------
class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)

    organization_id = serializers.UUIDField(source="organization.id", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id",
            "reference",
            "user_id",
            "user_email",
            "organization_id",
            "organization_name",
            "role",
            "preferred_language",
            "display_name",
            "joined_at",
            "last_accessed_at",
            "is_active",
            "is_deleted",
            "metadata",
        ]
        read_only_fields = fields

# ---------- Remove User from Organisation Serializer ----------
class RemoveUserFromOrganizationSerializer(serializers.Serializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def validate(self, attrs):
        request = self.context["request"]
        organization = self.context["organization"]
        membership = self.context["membership"]

        # Only admins or superusers can remove users
        if not request.user.is_superuser:
            is_admin = Membership.objects.filter(
                user=request.user,
                organization=organization,
                role="admin",
                is_active=True,
                is_deleted=False,
            ).exists()

            if not is_admin:
                raise PermissionDenied(
                    "You do not have permission to remove users from this organization."
                )

        # FIRST check if user is trying to remove themselves
        if membership.user == request.user:
            raise ValidationError(
                "You cannot remove yourself from the organization. Please ask another admin."
            )

        # THEN check if trying to remove last admin
        if membership.role == "admin":
            admin_count = Membership.objects.filter(
                organization=organization,
                role="admin",
                is_active=True,
                is_deleted=False,
            ).count()
            if admin_count <= 1:
                raise ValidationError(
                    "Cannot remove the last admin from the organization."
                )

        attrs["membership"] = membership
        return attrs

    def delete(self):
        membership = self.validated_data["membership"]
        request = self.context["request"]

        # Soft delete using the correct field names
        membership.is_active = False
        membership.is_deleted = True
        membership.is_deleted_at = timezone.now()
        membership.is_deleted_by_email = request.user.email  # Correct field name!
        membership.is_deleted_reason = "Removed by admin"
        
        membership.save()

        return membership
