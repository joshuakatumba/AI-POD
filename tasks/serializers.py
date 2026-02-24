from django.db import transaction
from rest_framework import serializers
from django.utils import timezone

from projectMembers.models import ProjectMember
from .models import Task


class TaskReadSerializer(serializers.ModelSerializer):
    project = serializers.SerializerMethodField()
    assigned_to = serializers.SerializerMethodField()
    reported_by = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "reference",
            "name",
            "description",
            "due_date",
            "expected_hours",
            "status",
            "organisation",
            "project",
            "assigned_to",
            "reported_by",
            "created_by",
            "created_at",
            "closed_at",
        ]

    def get_project(self, obj):
        if obj.project:
            return {
                "id": obj.project.id,
                "name": obj.project.name,
                "description": getattr(obj.project, "description", None),
            }
        return None

    def get_assigned_to(self, obj):
        # Returns membership display_name if assigned
        if obj.assigned_to and getattr(obj.assigned_to, "membership", None):
            return {
                "id": obj.assigned_to.id,
                "name": obj.assigned_to.membership.display_name
            }
        return None

    def get_reported_by(self, obj):
        if obj.reported_by and getattr(obj.reported_by, "membership", None):
            return {
                "id": obj.reported_by.id,
                "name": obj.reported_by.membership.display_name
            }
        return None

class TaskCreateSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=ProjectMember.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Task
        fields = [
            "name",
            "description",
            "due_date",
            "expected_hours",
            "assigned_to",
        ]

    def validate_expected_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expected hours must be greater than 0.")
        return value

    def validate_due_date(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Due date must be in the future.")
        return value

    def validate(self, data):
        project = self.context["project"]
        member = data.get("assigned_to")

        if member and member.project_id != project.id:
            raise serializers.ValidationError({
                "assigned_to": f"ProjectMember {member.id} does not belong to project {project.id}."
            })

        return data

    @transaction.atomic
    def create(self, validated_data):
        project = self.context["project"]
        request = self.context["request"]

        reported_by = ProjectMember.objects.get(
            membership__user=request.user,
            project=project,
        )

        return Task.objects.create(
            **validated_data,
            project=project,
            organisation=project.organization,
            created_by=request.user,
            reported_by=reported_by,
        )
