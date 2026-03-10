from rest_framework.permissions import BasePermission


class CanCreateOrganization(BasePermission):
    message = "Members are not allowed to create organizations."

    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return not user.organisation_memberships.filter(role="member").exists()
