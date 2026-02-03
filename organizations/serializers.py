from rest_framework import serializers
from django.db import transaction

from .models import Organization, Membership


class OrganizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "type",
            "description",
            "email",
            "country",
        ]
        read_only_fields = ["id"]

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        user = request.user

        organization = Organization.objects.create(
            **validated_data,
            created_by=user,
        )

        Membership.objects.create(
            user=user,
            organization=organization,
            role="admin",
            created_by=user,
        )

        return organization
