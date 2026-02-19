from rest_framework.permissions import BasePermission
from organizations.models import Membership


class CanCreateProjectMember(BasePermission):
    message = "You must be an admin of this organization to add members to a project."

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

        # Check if user has membership in this org with role='admin'
        return Membership.objects.filter(
            organization_id=organisation_id,
            user=user,
            role="admin"
        ).exists()