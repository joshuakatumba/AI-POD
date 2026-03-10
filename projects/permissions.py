from projects.models import Project
from rest_framework.permissions import BasePermission

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

        # Check if user is an admin of this organization
        return user.organisation_memberships.filter(
            organization_id=organisation_id,
            role="admin"
        ).exists()


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
