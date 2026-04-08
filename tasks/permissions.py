from django.shortcuts import get_object_or_404
from rest_framework.permissions import BasePermission

from projectMembers.models import ProjectMember
from projects.models import Project
from tasks.models import Task
from tasks.models import TaskComment


class IsProjectMemberForTaskScope(BasePermission):
    message = "You must be a member of this project to access this resource."

    def has_permission(self, request, view):
        project = self._resolve_project(view)
        membership = ProjectMember.objects.filter(
            membership__user=request.user,
            project=project,
        ).first()

        if not membership:
            return False

        # Expose resolved context for views that need it.
        view.current_project = project
        view.requester_project_member = membership
        return True

    def _resolve_project(self, view):
        task_id = view.kwargs.get("task_id")
        project_id = view.kwargs.get("project_id")

        if project_id:
            return get_object_or_404(Project, id=project_id)

        if task_id:
            task = get_object_or_404(Task.objects.select_related("project"), id=task_id)
            return task.project

        return None

    def has_object_permission(self, request, view, obj):
        # If the object is a TaskComment and the request attempts to modify it,
        # only the comment author may perform the action.
        if isinstance(obj, TaskComment) and request.method in ("PATCH", "DELETE"):
            return getattr(obj, "created_by_id", None) == request.user.id

        return True
