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
        return user.memberships.filter(
            organization_id=organisation_id,
            role="admin"
        ).exists()
