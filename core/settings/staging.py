from .base import *

DEBUG = False
ALLOWED_HOSTS = ["localhost", "127.0.0.1","ai-daily-report.akademia.co.jp"]
CORS_ALLOWED_ORIGINS = ["https://ai-daily-report.akademia.co.jp"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB"),
        "USER": os.getenv("POSTGRES_USER"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD"),
        "HOST": os.getenv("POSTGRES_HOST"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

CSRF_TRUSTED_ORIGINS = ["https://ai-daily-report.akademia.co.jp"]