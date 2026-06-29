import logging

from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


class EmailService:
    def send(self, to_email, subject, text_body, html_body=None):
        # public method to send an email via SMTP
        self._send(to_email, subject, text_body, html_body)

    def send_test_email(self, recipient):
        from django.template.loader import render_to_string
        html_body = render_to_string("test.html", {})
        text_body = "Hello World! Email integration is working."
        self._send(recipient, "Hello World! — Email Test", text_body, html_body)

    def _send(self, to_email, subject, text_body, html_body=None):
        try:
            email = EmailMultiAlternatives(subject=subject, body=text_body, to=[to_email])
            if html_body:
                email.attach_alternative(html_body, "text/html")
            email.send(fail_silently=False)
        except Exception:
            logger.exception("Failed to send email to %s (subject: %s)", to_email, subject)