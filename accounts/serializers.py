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


class OrganisationSelectSerializer(serializers.Serializer):
    organisation_id = serializers.UUIDField()

    def validate_organisation_id(self, value):
        user = self.context["request"].user
        if not Membership.objects.filter(user=user, organization_id=value, is_active=True).exists():
            raise serializers.ValidationError("You are not a member of this organisation.")
        return value


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class TokenSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class MembershipInfoSerializer(serializers.Serializer):
    organization_id = serializers.CharField()
    organization_name = serializers.CharField()
    role = serializers.CharField()
    is_current = serializers.BooleanField()
    joined_at = serializers.DateTimeField()
    last_accessed_at = serializers.DateTimeField(allow_null=True)


class LoginResponseSerializer(serializers.Serializer):
    user_id = serializers.CharField()
    email = serializers.EmailField()
    organisation = serializers.CharField()
    role = serializers.CharField()
    tokens = TokenSerializer()
    memberships = MembershipInfoSerializer(many=True)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class OrganisationSelectResponseSerializer(serializers.Serializer):
    organisation = serializers.CharField()
    role = serializers.CharField()
    tokens = TokenSerializer()


class UserInfoSerializer(serializers.Serializer):
    user_id = serializers.CharField()
    email = serializers.EmailField()
    super_user = serializers.BooleanField()
    organisation = serializers.CharField()
    role = serializers.CharField()

class MeResponseSerializer(serializers.Serializer):
    user_id = serializers.CharField()
    email = serializers.EmailField()
    memberships = MembershipInfoSerializer(many=True)
