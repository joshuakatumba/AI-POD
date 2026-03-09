from django.db import transaction
from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from organizations.models import Organization, Membership
from projectMembers.models import ProjectMember
from projects.models import Project
from projectMembers.serializers import ProjectMemberReadSerializer

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
        user = request.user
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
            membership = Membership.objects.get(
                id=membership_id,
                organization_id=organisation_id,
                user=user
            )
        except Membership.DoesNotExist:
            raise ValidationError({"membership": "Invalid membership."})

        attrs["organization"] = organisation
        attrs["owner"] = membership
        attrs["created_by"] = request.user

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        """
        Automatically sets the owner and organisation.
        Project membership creation can be added later.
        """
        # Create project
        project = Project.objects.create(**validated_data)

        # Create admins project membership
        ProjectMember.objects.create(
            project=project,
            organisation=project.organization,
            membership=project.owner,
            role="admin",
            created_by=project.created_by,
        )

        return project

class ProjectReadSerializer(serializers.ModelSerializer):
    owner_id = serializers.UUIDField(source="owner.id", read_only=True)
    owner_name = serializers.CharField(source="owner.display_name", read_only=True)
    owner_email = serializers.EmailField(source="owner.user.email", read_only=True)

    members = ProjectMemberReadSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "reference",
            "name",
            "description",
            "members",
            "status",
            "start_date",
            "end_date",
            "is_active",
            "is_deleted",
            "visibility",
            "owner_id",
            "owner_name",
            "owner_email",
        ]


class ProjectDetailsSerializer(ProjectReadSerializer):
    progress_data = serializers.SerializerMethodField()

    class Meta(ProjectReadSerializer.Meta):
        # Include all existing fields + progressdata
        fields = ProjectReadSerializer.Meta.fields + ["progress_data"]

    def get_progress_data(self, obj):
        """
        Returns a dictionary of task counts grouped by status
        """
        # 'tasks' is the related_name on Task model pointing to Project
        task_counts = (
            obj.tasks.values("status")
            .annotate(count=Count("id"))
        )
        return {item["status"]: item["count"] for item in task_counts}


class ProjectUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = [
            "name",
            "description",
            "start_date",
            "end_date",
            "status",
            "visibility",
        ]

    def validate(self, attrs):
        start = attrs.get("start_date") or getattr(self.instance, "start_date")
        end = attrs.get("end_date") or getattr(self.instance, "end_date")
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        return attrs
