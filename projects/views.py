from django.shortcuts import get_object_or_404
from projects.models import Project
from projects.pagination import ProjectPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db import DatabaseError
from django.db.models import Q
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from organizations.models import Membership, Organization
from projects.permissions import CanCreateProject
from projects.serializers import ProjectCreateSerializer, ProjectReadSerializer


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

        queryset = Project.objects.filter(
            organization_id=organisation_id,
            is_deleted=False,
        ).order_by("-created_at")

        # --- Apply search ---
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
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
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @swagger_auto_schema(
        operation_description="List projects under an organization.",
        manual_parameters=[
            openapi.Parameter("search", openapi.IN_QUERY, "Search by name or description", type=openapi.TYPE_STRING),
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
