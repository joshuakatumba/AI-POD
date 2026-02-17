from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from organizations.models import Organization, Membership
from projects.models import Project

User = get_user_model()


class ProjectCreateSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)
    owner_name = serializers.SerializerMethodField()
    owner_email = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "reference",
            "name",
            "description",
            "status",
            "start_date",
            "end_date",
            "is_active",
            "is_deleted",
            "owner_id",
            "owner_name",
            "owner_email",
            "visibility",
        ]
        read_only_fields = [
            "id",
            "reference",
            "status",
            "is_active",
            "is_deleted",
            "owner_id",
            "owner_name",
            "owner_email",
        ]

    def get_owner_name(self, obj):
        return getattr(obj.owner, "display_name", None)

    def get_owner_email(self, obj):
        return getattr(getattr(obj.owner, "user", None), "email", None)

    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            raise ValidationError("Request context is required.")

        auth = request.auth or {}
        organisation_id = auth.get("organisation_id")
        membership_id = auth.get("membership_id")

        if not organisation_id:
            raise ValidationError({"organisation": "Organisation not provided."})

        if not membership_id:
            raise ValidationError({"membership": "Membership not provided."})

        try:
            organisation = Organization.objects.get(id=organisation_id)
        except Organization.DoesNotExist:
            raise ValidationError({"organisation": "Invalid organisation."})

        try:
            membership = Membership.objects.get(id=membership_id)
        except Membership.DoesNotExist:
            raise ValidationError({"membership": "Invalid membership."})

        attrs["organization"] = organisation
        attrs["owner"] = membership
        attrs["created_by"] = request.user

        return attrs

    def create(self, validated_data):
        """
        Automatically sets the owner and organisation.
        Project membership creation can be added later.
        """
        return super().create(validated_data)
