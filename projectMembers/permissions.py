from rest_framework.permissions import BasePermission
from organizations.models import Membership
from projectMembers.models import ProjectMember


class CanCreateProjectMember(BasePermission):
    message = "You must be an admin of this organization to add members to a project."

    def has_permission(self, request, view):
        user = request.user
        auth = getattr(request, "auth", {}) or {}
        organisation_id = auth.get("organisation_id")
        project_id = view.kwargs.get("project_id")

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not organisation_id or not project_id:
            return False

        return ProjectMember.objects.filter(
            organisation_id=organisation_id,
            project_id=project_id,
            membership__user=user,
            role="admin",
        ).exists()
    
class CanViewProjectMembers(BasePermission):
    message = "You must be a member of this organization to view project members."

    def has_permission(self, request, view):
        user = request.user
        auth = getattr(request, "auth", {}) or {}
        organisation_id = auth.get("organisation_id")

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        if not organisation_id:
            return False

        # Check if user is a member of this organization
        return Membership.objects.filter(
            organization_id=organisation_id,
            user=user
        ).exists()
    
class CanUpdateProjectMember(BasePermission):
    message = "You must be an admin of this organization to update project members."

    def has_permission(self, request, view):
        user = request.user
        auth = getattr(request, "auth", {}) or {}
        organisation_id = auth.get("organisation_id")
        project_id = view.kwargs.get("project_id")

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:  #Superusers can update
            return True

        if not organisation_id or not project_id:
            return False

        return ProjectMember.objects.filter(
            organisation_id=organisation_id,
            project_id=project_id,
            membership__user=user,
            role="admin",
        ).exists()