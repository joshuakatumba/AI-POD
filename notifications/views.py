from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import generics, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notifications.service import EmailService
from sysadmin.permissions import IsSystemAdmin


class SendTestEmailView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    @swagger_auto_schema(
        operation_description="Send a Hello World test email via SES to verify the integration is working.",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=["recipient"],
            properties={
                "recipient": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format=openapi.FORMAT_EMAIL,
                    description="Email address to send the test email to.",
                )
            },
        ),
        responses={
            200: openapi.Response("Test email dispatched."),
            400: openapi.Response("recipient field is required."),
            403: openapi.Response("Only system admins can access this resource."),
        },
        tags=["Notifications"],
    )
    def post(self, request):
        recipient = request.data.get("recipient", "").strip()
        if not recipient:
            raise serializers.ValidationError({"recipient": "This field is required."})

        EmailService().send_test_email(recipient)
        return Response(
            {"detail": f"Test email sent to {recipient}."},
            status=status.HTTP_200_OK,
        )
