from rest_framework.permissions import BasePermission


class CanCreateOrganization(BasePermission):
    message = "Members are not allowed to create organizations."

    def has_permission(self, request, view):
        user = request.user
# Block unauthenticated users immediately
        if not user or not user.is_authenticated:
            return False
# Superusers bypass all downstream role restrictions
        if user.is_superuser:
            return True
# Isolate and block mixed-role gaps.
# Fetch all roles across all organizationss to evaluate the edge case
        user_roles = user.organization_memberships.values_list('role', flat=True)
# If the user is designated as a 'member' anywhere in the system, 
# Their privilege to create new organizations is completely revoked.
        if "member" in user_roles:
            return False

        return True
