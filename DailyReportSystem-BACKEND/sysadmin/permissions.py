from rest_framework.permissions import BasePermission

class IsSystemAdmin(BasePermission):
    """
    Allows access only to only system admins.
    """
    message = "Only system admins can access this resource."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser

class IsAdminUser(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user and user.is_authenticated and (
                user.is_superuser or
                user.is_staff or
                getattr(user, "role", None) == "admin"
            )
        )

class CanViewAdminData(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return (
            user and user.is_authenticated and (
                user.is_superuser or
                user.is_staff or
                getattr(user, "role", None) == "admin"
            )
        )