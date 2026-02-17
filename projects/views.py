from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.db import DatabaseError
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema

from organizations.models import Membership, Organization
from projects.permissions import CanCreateProject
from projects.serializers import ProjectCreateSerializer


class ProjectsApiView(generics.GenericAPIView):
    serializer_class = ProjectCreateSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), CanCreateProject()]
        return [IsAuthenticated()]

    @swagger_auto_schema(
        operation_description="Create a project under an organization.",
        request_body=ProjectCreateSerializer,
        responses={
            200: ProjectCreateSerializer(many=True),
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
