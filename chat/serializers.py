from django.shortcuts import get_object_or_404
from rest_framework import serializers
from chat.models import Session, SessionMessage
from organizations.models import Membership, Organization
from projects.models import Project, ReportTask
from sysadmin.models import AIWorkflow
from tasks.models import Task
from rest_framework.exceptions import ValidationError
from tasks.serializers import TaskReadSerializer


class CreateSessionSerializer(serializers.Serializer):
    """The 'Input' Schema for creating a session"""
    project_id = serializers.UUIDField()
    workflow_id = serializers.UUIDField()

    # task_ids required for report sessions; optional (empty list ok) for requirements sessions
    task_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
    )

    session_type = serializers.CharField(default="report_generation")

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

        # Report sessions must have at least one task
        session_type = attrs.get("session_type", "report_generation")
        if session_type != "requirements" and not attrs.get("task_ids"):
            raise ValidationError({"task_ids": "At least one task is required for this session type."})

        attrs["organisation"] = organisation
        attrs["membership"] = membership
        attrs["created_by"] = request.user

        return attrs

    def create(self, validated_data):
        # 1. Extract validated data
        project_id = validated_data['project_id']
        workflow_id = validated_data['workflow_id']
        task_ids = validated_data.get('task_ids', [])
        session_type = validated_data.get('session_type', 'report_generation')
        organisation = validated_data['organisation']
        created_by = validated_data['created_by']
        membership = validated_data['membership']

        # Fetch actual instances (standard practice)
        project = get_object_or_404(Project, id=project_id)
        workflow = get_object_or_404(AIWorkflow, id=workflow_id)

        # 2. Initialize the Session
        session = Session.objects.create(
            created_by=created_by,
            organisation=organisation,
            membership=membership,
            project=project,
            workflow=workflow,
            session_type=session_type,
            status='ingesting',
            title=f"Inspection: {project.name}"
        )

        # 3. Attach tasks (only for non-requirements sessions)
        if task_ids:
            tasks = Task.objects.filter(id__in=task_ids)
            report_tasks = [
                ReportTask(
                    session=session,
                    task=task,
                    organisation=session.organisation,
                    created_by=created_by
                )
                for task in tasks
            ]
            ReportTask.objects.bulk_create(report_tasks)

        return session


class SessionResponseSerializer(serializers.ModelSerializer):
    """The 'Output' Schema to send back to React"""
    class Meta:
        model = Session
        fields = ['id', 'reference', 'title', 'status']


class SessionMessageDetailSerializer(serializers.ModelSerializer):
    """Serializer for individual chat messages within a session."""
    class Meta:
        model = SessionMessage
        fields = [
            'id', 
            'reference', 
            'role',
            'content', 
            'created_at', 
            'modified_at',
            'metadata'
        ]
        read_only_fields = ['id', 'created_at']


class SessionMessageCreateSerializer(serializers.ModelSerializer):
    # Mapping the incoming "text" key to the "content" model field
    text = serializers.CharField(source='content', write_only=True)

    class Meta:
        model = SessionMessage
        fields = [
            'id',
            'text',      # Received from frontend
            'content',
            'role',
            'created_at'
        ]
        read_only_fields = ['id', 'role', 'content', 'created_at']

    def create(self, validated_data):
        # Automatically set defaults for a user-initiated message
        validated_data['role'] = 'user' 
        validated_data['session_id'] = self.context.get('session_id')
        validated_data['created_by'] = self.context.get('request').user
        
        return super().create(validated_data)


class SessionReportTasksDetailSerializer(serializers.ModelSerializer):
    """Serializer for individual chat messages within a session."""
    task = TaskReadSerializer(read_only=True)

    class Meta:
        model = ReportTask
        fields = [
            'id', 
            'task', 
            'is_validated_by_ai',
            'ai_notes'
        ]


class SessionDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for a Session including its messages."""
    
    # Nested messages using the related_name from your Message model
    # (Assuming related_name='messages' in the SessionMessage foreign key)
    messages = SessionMessageDetailSerializer(many=True, read_only=True)
    session_tasks = SessionReportTasksDetailSerializer(many=True, read_only=True)
    
    # Descriptive read-only fields for linked models
    project_name = serializers.ReadOnlyField(source='project.name')
    workflow_name = serializers.ReadOnlyField(source='workflow.name')
    organisation_name = serializers.ReadOnlyField(source='organisation.name')
    
    # Human-readable choice labels
    # status_label = serializers.CharField(source='get_status_display', read_only=True)
    # session_type_label = serializers.CharField(source='get_session_type_display', read_only=True)

    class Meta:
        model = Session
        fields = [
            'id',
            'reference',
            'title',
            'session_type',
            "session_tasks",
            'status',
            'project',
            'project_name',
            'workflow',
            'workflow_name',
            'organisation',
            'organisation_name',
            'created_at', # From CommonField
            'modified_at', # From CommonField
            'messages',
        ]
        read_only_fields = ['id', 'reference', 'created_at', 'modified_at']