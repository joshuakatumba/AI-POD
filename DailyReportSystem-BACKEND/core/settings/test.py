from .base import *

DEBUG = False
SECRET_KEY = "test-secret"
ALLOWED_HOSTS = ["*"]
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOWED_ORIGINS = []

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "test_db",
        "USER": "postgres",
        "PASSWORD": "postgres",
        "HOST": "localhost",
        "PORT": "5432",
    }
}
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"