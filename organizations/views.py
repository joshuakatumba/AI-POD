from rest_framework.generics import CreateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import OrganizationCreateSerializer
from .permissions import CanCreateOrganization


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
