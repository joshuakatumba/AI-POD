from projects.models import Project, Report, ReportComment
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


class CanEditReportComment(BasePermission):
    message = "You must be the author of this report comment to edit it"

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method not in ("PATCH", "PUT"):
            return True

        auth = getattr(request, "auth", {}) or {}
        organisation_id = auth.get("organisation_id")
        report_id = view.kwargs.get("report_id")
        comment_id = view.kwargs.get("comment_id")

        if not organisation_id or not report_id or not comment_id:
            return False

        # Let the view return 404 when the comment does not exist in scope.
        comment = ReportComment.objects.filter(
            id=comment_id,
            report_id=report_id,
            organisation_id=organisation_id,
            is_deleted=False,
        ).first()
        if comment is None:
            return True

        return getattr(comment, "created_by_id", None) == request.user.id

    def has_object_permission(self, request, view, obj):
        return True


class CanDeleteReportComment(BasePermission):
    message = "Only the comment author or an organisation admin can delete this report comment."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if request.method != "DELETE":
            return True

        if user.is_superuser:
            return True

        auth = getattr(request, "auth", {}) or {}
        organisation_id = auth.get("organisation_id")
        membership_id = auth.get("membership_id")
        report_id = view.kwargs.get("report_id")
        comment_id = view.kwargs.get("comment_id")

        if not organisation_id or not membership_id or not report_id or not comment_id:
            return False

        is_org_admin = Membership.objects.filter(
            id=membership_id,
            user=user,
            organization_id=organisation_id,
            role="admin",
        ).exists()
        if is_org_admin:
            return True

        comment = ReportComment.objects.filter(
            id=comment_id,
            report_id=report_id,
            organisation_id=organisation_id,
            is_deleted=False,
        ).first()
        if comment is None:
            return True

        return getattr(comment, "created_by_id", None) == request.user.id