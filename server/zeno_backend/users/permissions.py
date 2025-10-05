from rest_framework import permissions

class IsAdminOrSuperUser(permissions.BasePermission):
    """
    Allows access to admin users and superusers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )
