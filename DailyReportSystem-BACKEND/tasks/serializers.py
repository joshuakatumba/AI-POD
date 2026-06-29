# pyrefly: ignore-file [missing-import]
from django.db import transaction
from django.shortcuts import get_object_or_404
from urllib.parse import urlparse
from rest_framework import serializers
from rest_framework.exceptions import NotFound, PermissionDenied
from django.utils import timezone

from core.models.constants import TASK_STATUS_CHOICES
from projectMembers.models import ProjectMember
from translation.models import Translation
from translation.serializers import TranslationReadSerializer
from .models import Task, TaskComment, TaskAttachment


class TaskReadSerializer(serializers.ModelSerializer):
    project = serializers.SerializerMethodField()
    assigned_to = serializers.SerializerMethodField()
    reported_by = serializers.SerializerMethodField()
    translations = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(read_only=True, required=False)
    attachments_count = serializers.IntegerField(read_only=True, required=False)

    class Meta:
        model = Task
        fields = [
            "id",
            "reference",
            "name",
            "description",
            "due_date",
            "expected_hours",
            "category",
            "priority",
            "status",
            "organisation",
            "project",
            "translations",
            "attachments",
            "assigned_to",
            "reported_by",
            "created_by",
            "created_at",
            "closed_at",
            "cancelled_at",
            "comments_count",
            "attachments_count",
        ]

    def get_project(self, obj):
        if obj.project:
            return {
                "id": obj.project.id,
                "name": obj.project.name,
                "description": getattr(obj.project, "description", None),
            }
        return None
    
    def get_translations(self, obj):
        from translation.models import Translation

        qs = Translation.objects.filter(
            scope="task",
            scope_id=obj.id,
        )

        return TranslationReadSerializer(qs, many=True).data

    def get_assigned_to(self, obj):
        if obj.assigned_to and getattr(obj.assigned_to, "membership", None):
            return {
                "id": obj.assigned_to.id,
                "name": obj.assigned_to.membership.display_name,
                "email": obj.assigned_to.membership.user.email,
            }
        return None

    def get_reported_by(self, obj):
        if obj.reported_by and getattr(obj.reported_by, "membership", None):
            return {
                "id": obj.reported_by.id,
                "name": obj.reported_by.membership.display_name,
                "email": obj.reported_by.membership.user.email,
            }
        return None

    def get_attachments(self, obj):
        attachments = getattr(obj, "active_attachments", None)
        if attachments is None:
            attachments = obj.attachments.filter(is_deleted=False)
        return TaskAttachmentReadSerializer(attachments, many=True).data


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
            "category",
            "priority",
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
        """
        Ensures the task deadline is not in the past.
        Today is allowed; only strictly past dates are rejected.
        FR-04.2: Tasks shall include a valid Deadline field.
        BUG-003 fix.
        """
        if value and value.date() < timezone.now().date():
            raise serializers.ValidationError("Due date cannot be in the past.")
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
            "category",
            "priority",
            "assigned_to",
        ]

        extra_kwargs = {
            "name": {"required": False},
            "description": {"required": False},
            "due_date": {"required": False},
            "expected_hours": {"required": False},
            "status": {"required": False},
            "category": {"required": False},
            "priority": {"required": False},
        }

    def validate_expected_hours(self, value):
        if value <= 0:
            raise serializers.ValidationError("Expected hours must be greater than 0.")
        return value
        
    def validate_due_date(self, value):
        if value and value.date() < timezone.now().date():
            raise serializers.ValidationError("Due date cannot be in the past.")
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
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class TaskCommentReadSerializer(serializers.ModelSerializer):
    task = serializers.SerializerMethodField()
    membership = serializers.SerializerMethodField()
    translations = serializers.SerializerMethodField()

    class Meta:
        model = TaskComment
        fields = [
            "id",
            "reference",
            "task",
            "content",
            "organisation",
            "membership",
            "translations",
            "is_deleted",
            "is_deleted_at",
            "is_deleted_by_email",
            "is_deleted_reason",
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
    
    def get_translations(self, obj):
        from translation.models import Translation

        qs = Translation.objects.filter(
            scope="task_comment",
            scope_id=obj.id,
        )

        return TranslationReadSerializer(qs, many=True).data


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
        if instance.is_deleted:
            raise NotFound("Comment not found.")

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # TODO: if content changed, enqueue async comment translation still.
        return instance


class TaskAttachmentReadSerializer(serializers.ModelSerializer):
    task = serializers.SerializerMethodField()
    membership = serializers.SerializerMethodField()

    class Meta:
        model = TaskAttachment
        fields = [
            "id",
            "reference",
            "task",
            "title",
            "type",
            "url",
            "membership",
            "is_deleted",
            "is_deleted_at",
            "is_deleted_by_email",
            "is_deleted_reason",
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


class TaskAttachmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAttachment
        fields = [
            "title",
            "type",
            "url",
        ]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title is required.")
        return value

    def validate_url(self, value):
        value = value.strip()
        parsed = urlparse(value)
        if parsed.scheme != "https":
            raise serializers.ValidationError("Only https URLs are allowed.")
        return value

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
            raise PermissionDenied("You must be a member of this project to view or create attachments.")

        attrs["task"] = task
        attrs["membership"] = membership
        attrs["organisation"] = task.organisation
        attrs["created_by"] = request.user
        return attrs

    def create(self, validated_data):
        return TaskAttachment.objects.create(**validated_data)