from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError

from organizations.models import Organization, Membership

User = get_user_model()

# ---------- Create Organisation Serializer ----------
class OrganizationCreateSerializer(serializers.ModelSerializer):

    invited_members = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        write_only=True,
        help_text="List of email addresses to invite as members (role='member')"
    )

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "type",
            "description",
            "email",
            "country",
            "invited_members",
        ]
        read_only_fields = ["id"]

    @transaction.atomic
    def create(self, validated_data):
        invited_emails = validated_data.pop("invited_members", None)
        user = self.context["request"].user

        # Create organization
        organization = Organization.objects.create(
            **validated_data,
            created_by=user,
        )

        # Creator becomes admin
        Membership.objects.create(
            user=user,
            organization=organization,
            role="admin",
            created_by=user,
        )

        # If field not provided OR empty → do nothing (tests expect no keys)
        if not invited_emails:
            return organization, {}
        
        # Remove duplicates
        invited_emails = set(invited_emails)
        added = []
        failed = []

        # Fetch all users once
        users = User.objects.filter(email__in=invited_emails)
        users_by_email = {u.email: u for u in users}

        # Track memberships created during THIS request
        created_user_ids = set()

        for email in invited_emails:

            invited_user = users_by_email.get(email)

            if not invited_user:
                failed.append({
                    "email": email,
                    "error": "User with this email does not exist."
                })
                continue

            # Already member in THIS org?
            already_member = Membership.objects.filter(
                organization=organization,
                user=invited_user,
                is_active=True
            ).exists()

            # Or already created earlier in this same request?
            if already_member or invited_user.id in created_user_ids:
                failed.append({
                    "email": email,
                    "error": "User is already a member of this organization."
                })
                continue

            membership = Membership.objects.create(
                user=invited_user,
                organization=organization,
                role="member",
                created_by=user,
            )

            created_user_ids.add(invited_user.id)

            added.append({
                "email": email,
                "membership_id": str(membership.id)
            })

        response_data = {}

        if added:
            response_data["invited_members_added"] = added

        if failed:
            response_data["invited_members_failed"] = failed

        return organization, response_data

# ---------- Add User to Organisation Serializer ----------
class AddUserToOrganizationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=["member", "admin"],
        required=False,
        default="member"
    )

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
            role=validated_data["role"],
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
        membership.is_deleted_by_email = request.user.email
        membership.is_deleted_reason = "Removed by admin"
        
        membership.save()

        return membership

# ---------- Change Member Role and Display Name Serializer ----------
class ChangeMemberRoleAndNameSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=["admin", "member"],
        required=False,
        help_text="New role for the member. Must be 'admin' or 'member'. Only admins can change roles."
    )
    
    display_name = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        help_text="Display name for the member in this organization. Users can only update their own display name."
    )

    def validate(self, attrs):
        request = self.context["request"]
        organization = self.context["organization"]
        membership = self.context["membership"]

        # Get current user and check if they're the target user
        current_user = request.user
        is_target_user = (membership.user == current_user)
        
        # Check role changes
        if "role" in attrs:
            # Only admins or superusers can change roles
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
                        "You do not have permission to change roles in this organization."
                    )
            
            # Check if role is actually changing
            if attrs["role"] == membership.role:
                raise ValidationError(
                    f"User already has the role '{membership.role}'. No change needed."
                )

            # Prevent demoting the last admin
            if membership.role == "admin" and attrs["role"] == "member":
                admin_count = Membership.objects.filter(
                    organization=organization,
                    role="admin",
                    is_active=True,
                    is_deleted=False,
                ).count()
                
                if admin_count <= 1:
                    raise ValidationError(
                        "Cannot demote the last admin of the organization. "
                        "Please assign another admin first."
                    )
        
        # Check display name changes - STRICT: Only the user themselves can update
        if "display_name" in attrs:
            if not is_target_user:
                raise PermissionDenied(
                    "You can only update your own display name."
                )
        
        # At least one field should be provided
        if not attrs:
            raise ValidationError(
                "At least one of 'role' or 'display_name' must be provided."
            )

        return attrs

    def update(self, instance, validated_data):
        # Update role if provided
        if "role" in validated_data:
            instance.role = validated_data["role"]
        
        # Update display name if provided
        if "display_name" in validated_data:
            instance.display_name = validated_data["display_name"]
        
        instance.save()
        
        return instance
    
# ---------- Delete Organisation Serializer (Soft Delete) ----------
class OrganizationDeleteSerializer(serializers.Serializer):
    deletion_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        help_text="Optional reason for deleting the organization"
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def validate(self, attrs):
        request = self.context["request"]
        organization = self.context["organization"]

        # Only superusers or organization admins can delete the organization
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
                    "You do not have permission to delete this organization. "
                    "Only superusers or organization admins can delete an organization."
                )

        # Check if organization is already deleted
        if organization.is_deleted:
            raise ValidationError(
                "This organization has already been deleted."
            )

        # Store the organization in attrs for use in delete method
        attrs["organization"] = organization
        return attrs

    @transaction.atomic
    def delete(self):
        """Perform soft delete of the organization"""
        organization = self.validated_data["organization"]
        request = self.context["request"]
        deletion_reason = self.validated_data.get("deletion_reason", "")

        # Soft delete the organization
        organization.is_active = False
        organization.is_deleted = True
        organization.is_deleted_at = timezone.now()
        organization.is_deleted_by = request.user  # FK to User
        organization.is_deleted_reason = deletion_reason
        
        organization.save()

        # Soft delete all active memberships
        Membership.objects.filter(
            organization=organization,
            is_deleted=False
        ).update(
            is_active=False,
            is_deleted=True,
            is_deleted_at=timezone.now(),
            is_deleted_by_email=request.user.email,  # Membership uses email field
            is_deleted_reason=f"Organization deleted: {deletion_reason or 'No reason provided'}"
        )

        return organization
