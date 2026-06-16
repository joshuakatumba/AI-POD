import logging
import os

from botocore.exceptions import BotoCoreError, ClientError
from django.template.loader import render_to_string

from .ses_client import get_ses_client

logger = logging.getLogger(__name__)

SENDER = os.getenv("DEFAULT_FROM_EMAIL")


class EmailService:
    def send(self, to_email, subject, text_body, html_body=None):
        # public method to send an email via SES."""
        self._send(to_email, subject, text_body, html_body)

    def send_test_email(self, recipient):
        html_body = render_to_string("test.html", {})
        text_body = "Hello World! SES integration is working."
        self._send(recipient, "Hello World! — SES Test", text_body, html_body)

    def _send(self, to_email, subject, text_body, html_body=None):
        message = {
            "Subject": {"Data": subject, "Charset": "UTF-8"},
            "Body": {"Text": {"Data": text_body, "Charset": "UTF-8"}},
        }
        if html_body:
            message["Body"]["Html"] = {"Data": html_body, "Charset": "UTF-8"}

        try:
            client = get_ses_client()
            client.send_email(
                Source=SENDER,
                Destination={"ToAddresses": [to_email]},
                Message=message,
            )
        except (BotoCoreError, ClientError):
            logger.exception("Failed to send email to %s (subject: %s)", to_email, subject)