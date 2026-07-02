from .base import *

DEBUG = False
ALLOWED_HOSTS = ["mydomain.com"] # TODO: Fix this for production

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

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

CSRF_TRUSTED_ORIGINS = ["https://mydomain.com"] # TODO: Fix this for production