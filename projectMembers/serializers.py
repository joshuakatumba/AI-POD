from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from organizations.models import Organization, Membership
from projects.models import Project
from projectMembers.models import ProjectMember

User = get_user_model()


class ProjectMemberCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(write_only=True)

    member_id = serializers.SerializerMethodField()
    member_name = serializers.SerializerMethodField()
    member_email = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMember
        fields = [
            "id",
            "reference",
            "member_id",
            "member_name",
            "member_email",
            "email",
            "role",
            "status",
            "is_active",
            "is_deleted",
        ]
        read_only_fields = [
            "id",
            "reference",
            "member_id",
            "member_name",
            "member_email",
            "is_active",
            "is_deleted",
        ]

    def get_member_id(self, obj):
        return getattr(obj.membership, "id", None)

    def get_member_name(self, obj):
        return getattr(obj.membership, "display_name", None)

    def get_member_email(self, obj):
        return getattr(getattr(obj.membership, "user", None), "email", None)

    def validate(self, attrs):
        request = self.context.get("request")
        if not request:
            raise ValidationError("Request context is required.")

        auth = request.auth or {}
        user = request.user

        organisation_id = auth.get("organisation_id")

        if not organisation_id:
            raise ValidationError({"organisation": "Organisation not provided."})

        # Get project_id from URL kwargs
        project_id = self.context.get("view").kwargs.get("project_id")
        if not project_id:
            raise ValidationError({"project": "Project ID not provided."})
        
        #Check if the user with the provided email already exists
        try:
            added_user = User.objects.get(email=attrs["email"])
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        
        #Check if the above confirmed user has organisation membership
        try:
            membership = Membership.objects.get(
                user=added_user,
                organization_id=organisation_id
            )
        except Membership.DoesNotExist:
            raise serializers.ValidationError("User is not a member of the organisation.")

        # Validate if the  project exists
        try:
            project = Project.objects.get(id=project_id, organization_id=organisation_id)
        except Project.DoesNotExist:
            raise ValidationError( "Project does not exist.")

        # Check duplicate project member
        if ProjectMember.objects.filter(project=project, membership=membership).exists():
            raise ValidationError("Member already exists in this project.")

        attrs["project"] = project
        attrs["organisation"] = project.organization
        attrs["membership"] = membership
        attrs["created_by"] = request.user

        return attrs

    def create(self, validated_data):
        validated_data.pop("email", None)
        return super().create(validated_data)