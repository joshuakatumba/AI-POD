from django.utils import timezone
from django.shortcuts import get_object_or_404
from projects.helpers import queue_project_translation
from projects.models import Project, Report, ReportComment
from projects.pagination import ProjectPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db import DatabaseError
from django.db.models import Q
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from datetime import datetime


from organizations.models import Membership, Organization
from projects.permissions import CanCreateProject, CanDeleteProject, CanUpdateProject, IsReportOrgMember
from projects.serializers import ProjectCreateSerializer, ProjectDetailsSerializer, ProjectReadSerializer, ProjectUpdateSerializer, ReportCommentCreateSerializer, ReportCommentReadSerializer, ReportDetailSerializer, ReportUpdateSerializer


class ProjectsApiView(generics.GenericAPIView):
    pagination_class = ProjectPagination

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectCreateSerializer
        return ProjectReadSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanCreateProject()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        auth = self.request.auth or {}
        organisation_id = auth.get("organisation_id")
        user = self.request.user        
        queryset = Project.objects.filter(
            organization_id=organisation_id,
            is_deleted=False,
        ).order_by("-created_at")

        queryset = queryset.filter(
            Q(visibility="organisation") |
            Q(visibility="team", members__membership__user__id=user.id)
        ).distinct()

        # --- Apply search ---
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        # --- Filter by member_user_id (project member) ---
        member_user_id = self.request.query_params.get("member_user_id")
        if member_user_id:
            queryset = queryset.filter(
                members__membership__user__id=member_user_id,
                members__organisation_id=organisation_id,
            ).distinct()

        return queryset

    @swagger_auto_schema(
        operation_description="Create a project under an organization.",
        request_body=ProjectCreateSerializer,
        responses={
            201: ProjectCreateSerializer(many=False),
            400: openapi.Response(description="Bad request - validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Permission denied - user cannot create project"),
        },
        tags=["Projects"],
    )
    def post(self, request):
        """Create a project under an organization"""
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        project = serializer.save()

        # queue trigger translation
        queue_project_translation(project)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_description="List projects under an organization.",
        manual_parameters=[
            openapi.Parameter("search", openapi.IN_QUERY, "Search by name or description", type=openapi.TYPE_STRING),
            openapi.Parameter("member_user_id", openapi.IN_QUERY, "Filter projects where the user is a project member", type=openapi.TYPE_STRING),
            openapi.Parameter("page", openapi.IN_QUERY, "Page number", type=openapi.TYPE_INTEGER),
            openapi.Parameter("page_size", openapi.IN_QUERY, "Items per page", type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: ProjectReadSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Permission denied - user cannot read projects"),
        },
        tags=["Projects"],
    )
    def get(self, request):
        """List projects under an organization with pagination and search"""
        queryset = self.get_queryset()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class ProjectDetailApiView(generics.GenericAPIView):
    """
    Retrieve, update, or delete a single project by UUID.
    """
    lookup_field = "id"

    def get_permissions(self):
        if self.request.method == "PATCH":
            return [IsAuthenticated(), CanUpdateProject()]
        if self.request.method == "DELETE":
            return [IsAuthenticated(), CanDeleteProject()]
        return [IsAuthenticated()]

    def get_queryset(self):
        """Return projects for the current organization, excluding deleted."""
        organisation_id = self.request.auth.get("organisation_id")
        return Project.objects.filter(
            organization_id=organisation_id,
            is_deleted=False,
            is_active=True,
        )

    @swagger_auto_schema(
        operation_description="Retrieve a single project",
        responses={200: ProjectDetailsSerializer()},
        tags=["Projects"],
    )
    def get(self, request, project_id):
        project = get_object_or_404(self.get_queryset(), id=project_id)
        serializer = ProjectDetailsSerializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_description="Update a project (PATCH)",
        request_body=ProjectUpdateSerializer,
        responses={200: ProjectReadSerializer()},
        tags=["Projects"],
    )
    def patch(self, request, project_id):
        project = get_object_or_404(self.get_queryset(), id=project_id)
        self.check_object_permissions(request, project)
        serializer = ProjectUpdateSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        project = serializer.save()

        # queue trigger translation
        queue_project_translation(project)

        return Response(ProjectReadSerializer(project).data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_description="Delete a project (soft delete)",
        responses={204: "No Content"},
        tags=["Projects"],
    )
    def delete(self, request, project_id):
        project = get_object_or_404(self.get_queryset(), id=project_id)
        # Explicitly trigger has_object_permission
        self.check_object_permissions(request, project)
        
        # Soft delete
        project.status = "cancelled"
        project.is_active = False
        project.is_deleted = True
        project.is_deleted_at = timezone.now()
        project.is_deleted_by_email = request.user.email
        project.is_deleted_reason = "Removed by admin"
        project.save()

        return Response(
            {
                "detail": "Project successfully deleted.",
                "project_id": str(project.id),
                "deleted_by": request.user.email,
            },
            status=status.HTTP_200_OK,
        )

class ReportsApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReportDetailSerializer
    pagination_class = ProjectPagination

    def get_queryset(self):
        auth = self.request.auth or {}
        organisation_id = auth.get("organisation_id")
        queryset = Report.objects.filter(
            organisation_id=organisation_id,
            is_deleted=False,
        ).select_related(
            "session",
            "project",
            "membership",
            "membership__user",
            "organisation",
        ).prefetch_related(
            "report_tasks",
            "report_tasks__task",
            "report_tasks__task__assigned_to",
            "report_tasks__task__assigned_to__membership",
        ).order_by("-created_at")
        
        # Filter by membership if provided
        membership = self.request.query_params.get("membership")
        if membership:
            queryset = queryset.filter(membership_id=membership)
        
        # Filter by membership if provided
        membership_user_id = self.request.query_params.get("membership_user_id")
        if membership_user_id:
            queryset = queryset.filter(
                membership__user__id=membership_user_id,
                organisation_id=organisation_id,
            ).distinct()
        
        # Filter by project if provided
        project = self.request.query_params.get("project")
        if project:
            queryset = queryset.filter(project_id=project)
        
        # Filter by month if provided (format: YYYY-MM)
        month = self.request.query_params.get("month")
        if month:
            try:
                parsed_date = datetime.strptime(month, "%Y-%m")
                queryset = queryset.filter(
                    created_at__year=parsed_date.year,
                    created_at__month=parsed_date.month,
                )
            except ValueError:
                raise ValidationError(
                    {"month": "Invalid month format. Expected YYYY-MM."}
                )
        return queryset

    @swagger_auto_schema(
        operation_description="List all reports for the organization.",
        manual_parameters=[
            openapi.Parameter("membership", openapi.IN_QUERY, "Filter by membership UUID", type=openapi.TYPE_STRING),
            openapi.Parameter("membership_user_id", openapi.IN_QUERY, "Filter reports where the user has organisation membership", type=openapi.TYPE_STRING),
            openapi.Parameter("project", openapi.IN_QUERY, "Filter by project UUID", type=openapi.TYPE_STRING),
            openapi.Parameter("month", openapi.IN_QUERY, "Filter by month (format: YYYY-MM)", type=openapi.TYPE_STRING),
            openapi.Parameter("page", openapi.IN_QUERY, "Page number", type=openapi.TYPE_INTEGER),
            openapi.Parameter("page_size", openapi.IN_QUERY, "Items per page", type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: ReportDetailSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
        },
        tags=["Reports"],
    )
    def get(self, request):
        """List all reports with optional filtering"""
        queryset = self.get_queryset()
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        serializer = self.get_serializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

class ReportDetailApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReportDetailSerializer

    def get_queryset(self):
        auth = self.request.auth or {}
        organisation_id = auth.get("organisation_id")
        return Report.objects.filter(
            organisation_id=organisation_id,
            is_deleted=False,
        ).select_related(
            "session",
            "project",
            "membership",
            "membership__user",
            "organisation",
        ).prefetch_related(
            "report_tasks",
            "report_tasks__task",
            "report_tasks__task__assigned_to",
            "report_tasks__task__assigned_to__membership",
        )

    @swagger_auto_schema(
        operation_description="Retrieve a single report by ID.",
        responses={
            200: ReportDetailSerializer(),
            401: openapi.Response(description="Authentication required"),
            404: openapi.Response(description="Report not found"),
        },
        tags=["Reports"],
    )
    def get(self, request, report_id):
        report = get_object_or_404(self.get_queryset(), id=report_id)
        serializer = self.get_serializer(report)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @swagger_auto_schema(
        operation_description="Update a report (partial update).",
        request_body=ReportUpdateSerializer,
        responses={200: ReportDetailSerializer()},
        tags=["Reports"],
    )
    def patch(self, request, report_id):
        report = get_object_or_404(self.get_queryset(), id=report_id)
        serializer = ReportUpdateSerializer(report, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        detail_serializer = ReportDetailSerializer(report)
        return Response(detail_serializer.data, status=status.HTTP_200_OK)


class ReportInvalidateApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        auth = self.request.auth or {}
        organisation_id = auth.get("organisation_id")
        return Report.objects.filter(
            organisation_id=organisation_id,
            is_deleted=False,
        ).select_related(
            "session",
            "project",
            "membership",
            "membership__user",
            "organisation",
        )

    @swagger_auto_schema(
        operation_description="Mark a report as invalid (soft delete). Use this when duplicate reports are generated for the same day and you need to discard the erroneous ones.",
        responses={
            200: openapi.Response(
                description="Report successfully invalidated.",
                examples={
                    "application/json": {
                        "detail": "Report successfully invalidated.",
                        "report_id": "<uuid>",
                        "invalidated_by": "user@example.com",
                    }
                },
            ),
            400: openapi.Response(description="Report is already invalid."),
            401: openapi.Response(description="Authentication required"),
            404: openapi.Response(description="Report not found"),
        },
        tags=["Reports"],
    )
    def delete(self, request, report_id):
        report = get_object_or_404(self.get_queryset(), id=report_id)

        if report.status == "invalid":
            raise ValidationError({"detail": "This report is already marked as invalid."})

        report.status = "invalid"
        report.is_deleted = True
        report.is_deleted_at = timezone.now()
        report.is_deleted_by_email = request.user.email
        report.is_deleted_reason = "Marked as invalid by user — duplicate or erroneous report."
        report.save()

        return Response(
            {
                "detail": "Report successfully invalidated.",
                "report_id": str(report.id),
                "invalidated_by": request.user.email,
            },
            status=status.HTTP_200_OK,
        )


class ReportCommentsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsReportOrgMember]
    serializer_class = ReportCommentCreateSerializer

    @swagger_auto_schema(
        operation_description="Get all comments on a report. Requester must be an organization member.",
        responses={
            200: ReportCommentReadSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not an organization member"),
            404: openapi.Response(description="Report not found"),
        },
        tags=["Report Comments"],
    )
    def get(self, request, report_id):
        organisation_id = request.auth.get("organisation_id")
        comments = ReportComment.objects.filter(
            report_id=report_id,
            is_deleted=False,
            organisation_id=organisation_id,
        ).select_related(
            "report",
            "parent",
            "membership",
            "membership__user",
        )
        serializer = ReportCommentReadSerializer(comments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        operation_description="Create a comment on a report. Requester must be an organization member.",
        request_body=ReportCommentCreateSerializer,
        responses={
            201: ReportCommentReadSerializer,
            400: openapi.Response(description="Validation error"),
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not an organization member"),
            404: openapi.Response(description="Report not found"),
        },
        tags=["Report Comments"],
    )
    def post(self, request, report_id):
        serializer = ReportCommentCreateSerializer(
            data=request.data,
            context={"request": request, "report_id": report_id},
        )
        serializer.is_valid(raise_exception=True)
        comment = serializer.save()

        return Response(
            ReportCommentReadSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )


class ReportCommentDetailView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsReportOrgMember]
    serializer_class = ReportCommentReadSerializer

    @swagger_auto_schema(
        operation_description="Get a single report comment. Requester must be an organization member.",
        responses={
            200: ReportCommentReadSerializer,
            401: openapi.Response(description="Authentication required"),
            403: openapi.Response(description="Not an organization member"),
            404: openapi.Response(description="Report or Comment not found"),
        },
        tags=["Report Comments"],
    )
    def get(self, request, report_id, comment_id):
        organisation_id = request.auth.get("organisation_id")
        comment = get_object_or_404(
            ReportComment.objects.select_related(
                "report",
                "parent",
                "membership",
                "membership__user",
            ),
            id=comment_id,
            report_id=report_id,
            organisation_id=organisation_id,
            is_deleted=False,
        )

        return Response(ReportCommentReadSerializer(comment).data, status=status.HTTP_200_OK)