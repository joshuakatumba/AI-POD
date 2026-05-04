from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.timezone import now

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth.tokens import default_token_generator

from core.models.constants import LANGUAGE_CHOICES
from organizations.models import Membership

User = get_user_model()

class UserSignUpSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    preferred_language = serializers.ChoiceField(choices=LANGUAGE_CHOICES)

    class Meta:
        model = User
        fields = ("email", "password", "full_name", "preferred_language")

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            preferred_language=validated_data["preferred_language"]
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
    full_name = serializers.CharField()
    preferred_language = serializers.CharField()
    role = serializers.CharField()
    tokens = TokenSerializer()
    memberships = MembershipInfoSerializer(many=True)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class OrganisationSelectResponseSerializer(serializers.Serializer):
    organisation = serializers.CharField()
    role = serializers.CharField()
    tokens = TokenSerializer()
    user_id = serializers.CharField()
    email = serializers.EmailField()
    memberships = MembershipInfoSerializer(many=True)


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
    full_name = serializers.CharField()
    preferred_language = serializers.CharField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    reset_token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        uid = attrs.get("uid")
        token = attrs.get("reset_token")
        password = attrs.get("new_password")

        # Resolve user
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.filter(pk=user_id, is_active=True).first()
        except (TypeError, ValueError, OverflowError):
            user = None

        if not user:
            raise serializers.ValidationError(
                {"message": "Invalid or expired password reset token."}
            )

        # Validate token
        if not default_token_generator.check_token(user, token):
            raise serializers.ValidationError(
                {"message": "Invalid or expired password reset token."}
            )

        # Validate password (Django validators)
        try:
            validate_password(password, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(
                {"new_password": list(e.messages)}
            )

        # stash user for use in save()
        attrs["user"] = user
        return attrs

    def save(self, **kwargs):
        user = self.validated_data["user"]
        password = self.validated_data["new_password"]

        user.set_password(password)
        user.save(update_fields=["password"])

        return user