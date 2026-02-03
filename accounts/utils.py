from rest_framework_simplejwt.tokens import RefreshToken

def get_jwt_for_membership(user, membership):
    refresh = RefreshToken.for_user(user)
    refresh["organisation_id"] = str(membership.organization_id)
    refresh["membership_id"] = str(membership.id)
    refresh["role"] = membership.role
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }
