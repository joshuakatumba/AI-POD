from rest_framework.permissions import BasePermission

class IsSystemAdmin(BasePermission):
    """
    Allows access only to only system admins.
    """
    message = "Only system admins can access this resource."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser
