from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.timezone import now

from organizations.models import Membership

User = get_user_model()

class UserSignUpSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = ("email", "password")

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"]
        )
        return user


class TenantSelectSerializer(serializers.Serializer):
    tenant_id = serializers.UUIDField()

    def validate_tenant_id(self, value):
        user = self.context["request"].user
        if not Membership.objects.filter(user=user, organization_id=value, is_active=True).exists():
            raise serializers.ValidationError("You are not a member of this tenant.")
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
