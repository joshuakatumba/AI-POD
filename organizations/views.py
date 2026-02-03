from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework import generics, status

from organizations.models import Organization
from organizations.serializers import OrganizationCreateSerializer, AddUserToOrganizationSerializer
from organizations.permissions import CanCreateOrganization


# ---------- Create Organisation ----------
class OrganizationCreateView(CreateAPIView):
    serializer_class = OrganizationCreateSerializer
    permission_classes = [IsAuthenticated, CanCreateOrganization]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        organization = serializer.save()

        return Response(
            {
                "message": "organization.create_success",
                "data": serializer.data,
            },
            status=201,
        )


# ---------- Add User to Organisation ----------
class OrganizationMembersView(generics.GenericAPIView):
    serializer_class = AddUserToOrganizationSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request, organization_id):
        organization = get_object_or_404(Organization, id=organization_id)
        serializer = self.get_serializer(data=request.data, context={"request": request, "organization": organization})
        serializer.is_valid(raise_exception=True)
        membership = serializer.save()
        return Response(
            {"message": "User added successfully", "user": membership.user.email, "role": membership.role},
            status=status.HTTP_201_CREATED
        )