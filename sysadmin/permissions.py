from rest_framework.permissions import BasePermission, IsAuthenticated

class IsSystemAdmin(BasePermission):
    """
    Allows access only to only system admins.
    """
    message = "Only system admins can access this resource."

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated and request.user.is_superuser:
            return True