from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from organizations.models import Organization, Membership
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.timezone import now

User = get_user_model()


class AuthAPITests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="user@example.com",
            password="password123"
        )

        self.org1 = Organization.objects.create(
            name="Org One",
            slug="org-one",
            created_by=self.user
        )
        self.org2 = Organization.objects.create(
            name="Org Two",
            slug="org-two",
            created_by=self.user
        )

        self.membership1 = Membership.objects.create(
            user=self.user,
            organization=self.org1,
            role="admin",
            created_by=self.user,
            is_active=True,
            last_accessed_at=now()
        )

        self.membership2 = Membership.objects.create(
            user=self.user,
            organization=self.org2,
            created_by=self.user,
            role="member",
            is_active=True,
        )

        self.signup_url = reverse("signup")
        self.login_url = reverse("login")
        self.logout_url = reverse("logout")
        self.me_url = reverse("current-user")
        self.switch_url = reverse("switch-organization")

    # ---------- SIGNUP ----------

    def test_signup_success(self):
        response = self.client.post(self.signup_url, {
            "email": "new@example.com",
            "password": "password123"
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="new@example.com").exists())

    # ---------- LOGIN ----------

    def test_login_success(self):
        response = self.client.post(self.login_url, {
            "email": "user@example.com",
            "password": "password123"
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
        self.assertEqual(response.data["email"], "user@example.com")
        self.assertEqual(len(response.data["memberships"]), 2)


    def test_login_invalid_credentials(self):
        response = self.client.post(self.login_url, {
            "email": "user@example.com",
            "password": "wrongpass"
        })

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---------- CURRENT USER ----------

    def authenticate(self):
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        return refresh

    def test_current_user_success(self):
        self.authenticate()

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertEqual(len(response.data["memberships"]), 2)

        current = [m for m in response.data["memberships"] if m["is_current"] == True ][0]
        self.assertEqual(current["organization_name"], "Org One")


    def test_current_user_unauthenticated(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---------- SWITCH ORGANIZATION ----------

    def test_switch_organization_success(self):
        self.authenticate()

        response = self.client.post(self.switch_url, {
            "organisation_id": str(self.org2.id)
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["organisation"], str(self.org2.id))

    def test_switch_organization_not_member(self):
        self.authenticate()

        fake_org = Organization.objects.create(
            name="Fake Org",
            slug="fake-org",
            created_by=self.user
        )

        response = self.client.post(self.switch_url, {
            "organisation_id": str(fake_org.id)
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ---------- LOGOUT ----------

    def test_logout_success(self):
        refresh = self.authenticate()

        response = self.client.post(self.logout_url, {
            "refresh": str(refresh)
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_invalid_token(self):
        self.authenticate()

        response = self.client.post(self.logout_url, {
            "refresh": "not.a.real.token"
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
