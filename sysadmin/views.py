from django.shortcuts import render
from django.db.models import Prefetch, Count
from rest_framework.response import Response
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from organizations.models import Membership, Organization
from sysadmin.serializers import AdminOrganizationSerializer
from drf_yasg.utils import swagger_auto_schema
from sysadmin.permissions import IsSystemAdmin


# ---------- Admin List Organisations ----------
class AdminOrganisationListView(generics.ListAPIView):
    serializer_class = AdminOrganizationSerializer
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    @swagger_auto_schema(
        operation_summary="Admin list organizations",
        operation_description="Returns all organizations. Accessible only to system admins or superusers.",
        responses={
            200: AdminOrganizationSerializer(many=True),
            401: "Authentication required",
            403: "Permission denied",
        },
        tags=["Admin"],
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