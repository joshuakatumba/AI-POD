from projects.models import Project, Report
from rest_framework.permissions import BasePermission

from organizations.models import Membership

class CanCreateProject(BasePermission):
    message = "You must be an admin of this organization to create projects."

    def has_permission(self, request, view):
        user = request.user
        auth = getattr(request, "auth", {}) or {}
        organisation_id = auth.get("organisation_id")

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        # Extract organization_id from the URL kwargs
        if not organisation_id:
            return False

        # Check if user has membership in this org with role='admin'
        return user.organisation_memberships.filter(
            organization_id=organisation_id,
            role="admin"
        ).exists()


class CanUpdateProject(BasePermission):
    message = "You must be an admin of this organization to update projects."

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
        return True

    def has_object_permission(self, request, view, obj):
        user = request.user
        auth = getattr(request, "auth", {}) or {}
        organisation_id = auth.get("organisation_id")
        membership_id = auth.get("membership_id")

        if user.is_superuser:
            return True
        
        is_org_admin = user.organisation_memberships.filter(
            organization_id=organisation_id,
            role="admin"
        ).exists()

        if is_org_admin:
            return True
        
        is_project_admin = obj.members.filter(
            membership_id=membership_id,
            role="admin"
        ).exists()
        return is_project_admin


class CanDeleteProject(BasePermission):
    message = "Only the project owner can delete this project."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return True  # basic authentication check; ownership check is per object

    def has_object_permission(self, request, view, obj: Project):
        """
        Only allow deletion if request user owns the project.
        obj.owner is expected to be a Membership instance.
        """
        user = request.user
        if user.is_superuser:
            return True

        return getattr(obj.owner, "user_id", None) == user.id


class IsReportOrgMember(BasePermission):
    message = "You must be a member of this organisation to view report comments."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        
        auth = getattr(request, "auth", {}) or {}
        membership_id = auth.get("membership_id")
        organization_id = auth.get("organisation_id")
        if not membership_id:
            return False
        
        return Membership.objects.filter(
            user=user,
            organization_id=organization_id,
        ).exists()