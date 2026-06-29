from django.conf import settings

from .constants import EMAIL_CONTENT

DEFAULT_NOTIFICATION_LANGUAGE = settings.DEFAULT_NOTIFICATION_LANGUAGE


def normalize_language_code(language_code):
    if not language_code:
        return DEFAULT_NOTIFICATION_LANGUAGE

    normalized = str(language_code).strip().lower().replace("_", "-")
    if not normalized:
        return DEFAULT_NOTIFICATION_LANGUAGE

    return normalized.split("-")[0]


def resolve_email_language(email_type, preferred_language):
    language_code = normalize_language_code(preferred_language)
    supported = EMAIL_CONTENT.get(email_type, {})
    if language_code in supported:
        return language_code
    return DEFAULT_NOTIFICATION_LANGUAGE


def get_template_paths(email_type, lang_code):
    primary = f"{lang_code}/{email_type}.html"
    if lang_code == DEFAULT_NOTIFICATION_LANGUAGE:
        return [primary]
    return [primary, f"{DEFAULT_NOTIFICATION_LANGUAGE}/{email_type}.html"]


def get_email_content(email_type, preferred_language, **format_kwargs):
    lang_code = resolve_email_language(email_type, preferred_language)
    localized = EMAIL_CONTENT[email_type][lang_code]

    return {
        "language_code": lang_code,
        "subject": localized["subject"],
        "template_paths": get_template_paths(email_type, lang_code),
        "text_body": localized["text_body_template"].format(**format_kwargs),
    }