from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from drf_yasg import openapi
from django.db.models import Q, Prefetch, Count, F
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from organizations.models import Membership, Organization
from sysadmin.models import AIModel, AIWorkflow
from sysadmin.serializers import AIModelCreateSerializer, AIModelDetailSerializer, AIModelsUpdateSerializer, AIWorkflowCreateSerializer, AIWorkflowDetailSerializer, AIWorkflowUpdateSerializer, AdminOrganizationSerializer, AdminForceDeleteOrganizationSerializer, SysAdminUserSerializer, SysAdminUserUpdateSerializer
from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from sysadmin.permissions import CanViewAdminData, IsSystemAdmin, IsAdminUser
from django.contrib.auth import get_user_model

from django.db import IntegrityError
from rest_framework.exceptions import ValidationError

User = get_user_model()


# ---------- Admin List Organisations ----------
class AdminOrganisationListView(generics.ListAPIView):
    serializer_class = AdminOrganizationSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAdminData()]
        
        return [IsSystemAdmin()]

    @swagger_auto_schema(
        operation_summary="Admin list organizations",
        operation_description="Returns all organizations. Accessible only to system admins or superusers.",
        responses={
            200: AdminOrganizationSerializer(many=True),
            401: "Authentication required",
            403: "Permission denied",
        },
        tags=["Admin - Organizations"],
    )
    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        for organisation in queryset:
            creator_id = organisation.created_by_id
            organisation.creator_membership = next(
                (m for m in organisation.prefetched_memberships if m.user_id == creator_id),
                None
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def get_queryset(self):
        return (
            Organization.objects
            .filter(is_deleted=False)
            .select_related("created_by")
            .annotate(member_count=Count("memberships"))
            .prefetch_related(
                Prefetch(
                    "memberships",
                    queryset=Membership.objects.select_related("user"),
                    to_attr="prefetched_memberships"
                )
            )
            .order_by("-created_at")
        )


# ---------- Admin Force Delete Organisation ----------
class AdminForceDeleteOrganisationView(generics.GenericAPIView):
    serializer_class = AdminForceDeleteOrganizationSerializer
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    @swagger_auto_schema(
        operation_summary="Admin force delete organization",
        operation_description=(
            "Allows a platform admin to force delete any organization. "
            "Soft deletes the org, all its memberships, projects, and tasks."
        ),
        request_body=AdminForceDeleteOrganizationSerializer,
        responses={
            200: "Organization force deleted successfully",
            400: "Already deleted or invalid request",
            401: "Authentication required",
            403: "Permission denied",
            404: "Organization not found",
        },
        tags=["Admin - Organizations"],
    )
    def delete(self, request, organization_id):
        # Step 1 — fetch the org, return 404 if it doesn't exist
        organization = get_object_or_404(Organization, id=organization_id)

        # Step 2 — block early if already deleted before even hitting the serializer
        if organization.is_deleted:
            return Response(
                {
                    "message": "This organization has already been deleted.",
                    "organization_id": str(organization.id),
                    "is_deleted_at": organization.is_deleted_at,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 3 — pass org into serializer via context
        serializer = self.get_serializer(
            data=request.data,
            context={
                "request": request,
                "organization": organization,
            }
        )

        # Step 4 — validate (checks deleted again inside serializer as safety net)
        serializer.is_valid(raise_exception=True)

        # Step 5 — perform the cascade soft delete
        deleted_organization = serializer.delete()

        return Response(
            {
                "message": "organization.force_delete_success",
                "organization_id": str(deleted_organization.id),
                "organization_name": deleted_organization.name,
                "deleted_by": request.user.email,
                "is_deleted_at": deleted_organization.is_deleted_at,
            },
            status=status.HTTP_200_OK,
        )


# ---------- Admin Users View  ----------
class SysAdminUsersView(generics.GenericAPIView):
    serializer_class = SysAdminUserSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated(), CanViewAdminData()]
        
        return [IsSystemAdmin()]

    @swagger_auto_schema(
        operation_summary="Admin list users",
        operation_description="Returns all users. Accessible only to system admins or superusers.",
        responses={
            200: SysAdminUserSerializer(many=True),
            401: "Authentication required",
            403: "Permission denied",
        },
        tags=["Admin - Users"],
    )
    def get(self, request):
        memberships_qs = (
            Membership.objects
            .select_related("organization")
            .order_by(
                F("last_accessed_at").desc(nulls_last=True),
                "joined_at",
            )
        )

        users = (
            User.objects
            .all()
            .prefetch_related(
                Prefetch(
                    "organisation_memberships",
                    queryset=memberships_qs,
                    to_attr="prefetched_memberships",
                )
            )
        )

        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ---------- Admin User Details View  ----------
class SysAdminUsersDetailsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]
    serializer_class = SysAdminUserSerializer

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return SysAdminUserUpdateSerializer
        return None

    @swagger_auto_schema(
        operation_description="Update a user's active status or admin role.",
        request_body=SysAdminUserUpdateSerializer,
        responses={
            200: SysAdminUserUpdateSerializer,
            401: "Authentication required",
            403: "Super admin permission required",
            404: "User not found",
        },
        manual_parameters=[
            openapi.Parameter(
                "user_id",
                openapi.IN_PATH,
                description="User UUID",
                type=openapi.TYPE_STRING,
                format=openapi.FORMAT_UUID,
                required=True,
            ),
        ],
        tags=["Admin - Users"],
    )
    def patch(self, request, user_id):
        user = get_object_or_404(User, id=user_id)

        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

         # Serialize the updated instance
        response_serializer = SysAdminUserSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


# ---------- Admin AI Models View  ----------
class AIModelsApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AIModelCreateSerializer
        return AIModelDetailSerializer

    def get_queryset(self):
        queryset = AIModel.objects.all().order_by("-created_at")

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(provider__icontains=search) |
                Q(reference__icontains=search)
            )

        return queryset

    @swagger_auto_schema(
        operation_description="Create a new AI model configuration.",
        request_body=AIModelCreateSerializer,
        responses={
            201: AIModelDetailSerializer(),
            400: openapi.Response(description="Bad request - validation error"),
            401: openapi.Response(description="Authentication required"),
            500: openapi.Response(description="Internal server error"),
        },
        tags=["Admin - AI Models"],
    )
    def post(self, request, *args, **kwargs):
        """Create an AI model"""
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            instance = serializer.save()
            response_serializer = AIModelDetailSerializer(instance)

            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response(
                {"detail": "Validation error", "errors": e.detail},
                status=status.HTTP_400_BAD_REQUEST
            )

        except IntegrityError:
            return Response(
                {"detail": "AI model with these attributes already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            return Response(
                {"detail": "An unexpected error occurred."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @swagger_auto_schema(
        operation_description="List AI models.",
        manual_parameters=[
            openapi.Parameter(
                "search",
                openapi.IN_QUERY,
                "Search by name, provider, or reference",
                type=openapi.TYPE_STRING
            ),
        ],
        responses={
            200: AIModelDetailSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
        },
        tags=["Admin - AI Models"],
    )
    def get(self, request, *args, **kwargs):
        """List AI models with search"""
        queryset = self.get_queryset()
        serializer = AIModelDetailSerializer(queryset, many=True)
        return Response(serializer.data)


class AIModelApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return AIModelsUpdateSerializer
        return AIModelDetailSerializer

    def get_object(self, model_id):
        return get_object_or_404(AIModel, id=model_id)

    @swagger_auto_schema(
        operation_description="Retrieve an AI Model.",
        responses={
            200: AIModelDetailSerializer(),
            404: openapi.Response(description="AI Model not found"),
        },
        tags=["Admin - AI Models"],
    )
    def get(self, request, model_id):
        model = self.get_object(model_id)
        serializer = AIModelDetailSerializer(model)
        return Response(serializer.data)

    @swagger_auto_schema(
        operation_description="Update an AI Model.",
        request_body=AIModelsUpdateSerializer,
        responses={
            200: AIModelDetailSerializer(),
            400: openapi.Response(description="Validation error"),
            404: openapi.Response(description="AI Model not found"),
        },
        tags=["Admin - AI Models"],
    )
    def patch(self, request, model_id):
        model = self.get_object(model_id)

        serializer = self.get_serializer(model, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            instance = serializer.save()
        except IntegrityError:
            return Response(
                {"detail": "An AI model with these attributes already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = AIModelDetailSerializer(instance)
        return Response(response_serializer.data)


    @swagger_auto_schema(
        operation_description="Delete an AI Model (soft delete).",
        responses={
            200: openapi.Response(description="AI Model successfully deleted"),
            400: openapi.Response(description="AI Model is currently in use"),
            404: openapi.Response(description="AI Model not found"),
        },
        tags=["Admin - AI Models"],
    )
    def delete(self, request, model_id):
        model = self.get_object(model_id)

        # Check if model is used by any workflows
        if AIWorkflow.objects.filter(ai_model=model).exists():
            return Response(
                {
                    "detail": "This AI model cannot be deleted because it is currently in use by one or more workflows."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Soft delete
        model.is_active = False
        model.is_deleted = True
        model.is_deleted_at = timezone.now()
        model.is_deleted_by_email = request.user.email
        model.is_deleted_reason = "Removed by admin"
        model.save()

        return Response(
            {
                "detail": "AI Model successfully deleted.",
                "model_id": str(model.id),
                "deleted_by": request.user.email,
            },
            status=status.HTTP_200_OK,
        )


# ---------- Admin AI Workflows View  ----------
class AIWorkflowsApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AIWorkflowCreateSerializer
        return AIWorkflowDetailSerializer

    def get_queryset(self):
        return AIWorkflow.objects.select_related("ai_model").filter(is_deleted=False).order_by("-created_at")

    @swagger_auto_schema(
        operation_description="Create a new AI workflow.",
        request_body=AIWorkflowCreateSerializer,
        responses={
            201: AIWorkflowDetailSerializer(),
            400: openapi.Response(description="Bad request - validation error"),
            401: openapi.Response(description="Authentication required"),
        },
        tags=["Admin - AI Workflows"],
    )
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        instance = serializer.save()
        response_serializer = AIWorkflowDetailSerializer(instance)

        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @swagger_auto_schema(
        operation_description="List AI workflows.",
        responses={
            200: AIWorkflowDetailSerializer(many=True),
            401: openapi.Response(description="Authentication required"),
        },
        tags=["Admin - AI Workflows"],
    )
    def get(self, request):
        queryset = self.get_queryset()
        serializer = AIWorkflowDetailSerializer(queryset, many=True)
        return Response(serializer.data)


# ---------- Admin AI Workflows View  ----------
class AIWorkflowApiView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return AIWorkflowUpdateSerializer
        return AIWorkflowDetailSerializer

    def get_object(self, workflow_id):
        return get_object_or_404(AIWorkflow, id=workflow_id, is_deleted=False)

    @swagger_auto_schema(
        operation_description="Retrieve an AI workflow.",
        responses={
            200: AIWorkflowDetailSerializer(),
            404: openapi.Response(description="Workflow not found"),
        },
        tags=["Admin - AI Workflows"],
    )
    def get(self, request, workflow_id):
        workflow = self.get_object(workflow_id)
        serializer = AIWorkflowDetailSerializer(workflow)
        return Response(serializer.data)

    @swagger_auto_schema(
        operation_description="Update an AI workflow.",
        request_body=AIWorkflowUpdateSerializer,
        responses={
            200: AIWorkflowDetailSerializer(),
            400: openapi.Response(description="Validation error"),
            404: openapi.Response(description="Workflow not found"),
        },
        tags=["Admin - AI Workflows"],
    )
    def patch(self, request, workflow_id):
        workflow = self.get_object(workflow_id)

        serializer = self.get_serializer(workflow, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            instance = serializer.save()
        except IntegrityError:
            return Response(
                {"detail": "A workflow already exists for this category."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = AIWorkflowDetailSerializer(instance)
        return Response(response_serializer.data)

    @swagger_auto_schema(
        operation_description="Delete an AI Workflow (soft delete).",
        responses={
            200: openapi.Response(description="AI Workflow successfully deleted"),
            404: openapi.Response(description="Workflow not found"),
            },
            tags=["Admin - AI Workflows"],
        )
    def delete(self, request, workflow_id):
        workflow = self.get_object(workflow_id)
        
        # Soft delete
        workflow.is_active = False
        workflow.is_deleted = True
        workflow.is_deleted_at = timezone.now()
        workflow.is_deleted_by_email = request.user.email
        workflow.is_deleted_reason = "Removed by admin"
        workflow.save()
        
        return Response(
            {
                "detail": "AI Workflow successfully deleted.",
                "workflow_id": str(workflow.id),
                "deleted_by": request.user.email,
            },
            status=status.HTTP_200_OK,
        )