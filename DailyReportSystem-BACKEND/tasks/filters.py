import django_filters
from django.utils import timezone
from datetime import timedelta
from .models import Task


class TaskFilterSet(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status")
    assigned_to = django_filters.UUIDFilter(field_name="assigned_to__membership__user_id")
    project = django_filters.UUIDFilter(field_name="project_id")
    reported_by = django_filters.UUIDFilter(field_name="reported_by__membership__user_id")
    high_priority = django_filters.BooleanFilter(method="filter_high_priority")

    class Meta:
        model = Task
        fields = [
            "status",
            "assigned_to",
            "project",
            "reported_by",
            "high_priority",
        ]


    def filter_high_priority(self, queryset, name, value):
        if not value:
            return queryset

        active_statuses = [
            "in_progress",
            "blocked",
            "review",
            "testing",
        ]

        now = timezone.now()
        threshold_date = now + timedelta(days=3)

        return queryset.filter(
            status__in=active_statuses,
            due_date__lte=threshold_date,
        )
