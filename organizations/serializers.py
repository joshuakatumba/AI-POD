from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework.exceptions import PermissionDenied

from .models import Organization, Membership

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

        # Check permission
        if not request.user.is_superuser:
            is_admin = Membership.objects.filter(
                user=request.user,
                organization=organization,
                role="admin",
            ).exists()

            if not is_admin:
                raise PermissionDenied("You do not have permission to add users to this organization.")

        # Check user exists
        try:
            user = User.objects.get(email=attrs["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")

        # Check duplicate membership
        if Membership.objects.filter(
            user=user,
            organization=organization,
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
            role="member",  # default role
            created_by=request.user,
        )

# ---------- Organisation Membership Serializer ----------
class OrganizationMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    organization_id = serializers.UUIDField(source="organization.id", read_only=True)
    organization_name = serializers.CharField(source="organization.name", read_only=True)

    class Meta:
        model = Membership
        fields = [
            "id",
            "reference",
            "user_id",
            "user_email",
            "user_name",
            "organization_id",
            "organization_name",
            "role",
            "preferred_language",
            "display_name",
            "joined_at",
            "last_accessed_at",
            "metadata",
        ]
        read_only_fields = fields
