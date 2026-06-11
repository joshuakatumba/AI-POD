from rest_framework.pagination import PageNumberPagination

class ProjectPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class ReportPagination(PageNumberPagination):
    page_size_query_param = "page_size"

    def paginate_queryset(self, queryset, request, view=None):
        if request.query_params.get(self.page_size_query_param) is None:
            self.page_size = max(queryset.count(), 1)

        return super().paginate_queryset(queryset, request, view)