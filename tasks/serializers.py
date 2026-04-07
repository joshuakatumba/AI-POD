from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.exceptions import NotFound, PermissionDenied
from django.utils import timezone

from core.models.constants import TASK_STATUS_CHOICES
from projectMembers.models import ProjectMember
from .models import Task, TaskComment


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
    status = serializers.ChoiceField(
        choices=TASK_STATUS_CHOICES,
        required=False,
        default="backlog",
    )

    class Meta:
        model = Task
        fields = [
            "name",
            "status",
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
    
class TaskUpdateSerializer(serializers.ModelSerializer):
    expected_hours = serializers.FloatField(min_value=0.01,required=False)
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
            "status",
            "assigned_to",
        ]

        extra_kwargs = {
            "name": {"required": False},
            "description": {"required": False},
            "due_date": {"required": False},
            "expected_hours": {"required": False},
            "status": {"required": False},
        }

    def validate_expected_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expected hours must be greater than 0.")
        return value
        
    def validate_due_date(self, value):
        if value and value <= timezone.now():
            raise serializers.ValidationError("Due date must be in the future.")
        return value
        
    def validate(self, data):
        project = self.instance.project
        member = data.get("assigned_to")

        if member and member.project_id != project.id:
            raise serializers.ValidationError({
                "assigned_to": f"ProjectMember {member.id} does not belong to project {project.id}."
            })
        return data
        
    @transaction.atomic
    def update(self, instance, validated_data):
        if validated_data.get("status") == "cancelled" and not instance.cancelled_at:
            instance.cancelled_at = timezone.now()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class TaskCommentReadSerializer(serializers.ModelSerializer):
    task = serializers.SerializerMethodField()
    membership = serializers.SerializerMethodField()

    class Meta:
        model = TaskComment
        fields = [
            "id",
            "reference",
            "task",
            "content",
            "organisation",
            "membership",
            "created_by",
            "created_at",
            "modified_at",
        ]

    def get_task(self, obj):
        return {
            "id": obj.task.id,
            "reference": obj.task.reference,
            "name": obj.task.name,
        }

    def get_membership(self, obj):
        project_member = obj.membership
        member = getattr(project_member, "membership", None)
        return {
            "id": project_member.id,
            "reference": project_member.reference,
            "display_name": getattr(member, "display_name", None),
        }


class TaskCommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskComment
        fields = [
            "content",
        ]
        
    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Content is required.")
        return value.strip()

    def validate(self, attrs):
        request = self.context["request"]
        task_id = self.context["task_id"]
        
        task = get_object_or_404(Task, id=task_id)

        try:
            membership = ProjectMember.objects.get(
                membership__user=request.user,
                project=task.project
            )
        except ProjectMember.DoesNotExist:
            raise PermissionDenied("You must be a member of this project to view or create comments.")

        attrs["task"] = task
        attrs["membership"] = membership
        attrs["organisation"] = task.organisation
        attrs["created_by"] = request.user
        return attrs
    
    def create(self, validated_data):
       return TaskComment.objects.create(**validated_data)
        # TODO: enqueue async comment translations using celery.

class TaskCommentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskComment
        fields = [
            "content",
        ]
        extra_kwargs = {
            "content": {"required": False},
        }

    def validate_content(self, value):
        if value is not None and not value.strip():
            raise serializers.ValidationError("Content cannot be blank.")
        return value.strip() if value is not None else value

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # TODO: if content changed, enqueue async comment translation still.
        return instance