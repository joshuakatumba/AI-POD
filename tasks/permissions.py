from django.shortcuts import get_object_or_404
from rest_framework.permissions import BasePermission

from projectMembers.models import ProjectMember
from projects.models import Project
from tasks.models import Task


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
