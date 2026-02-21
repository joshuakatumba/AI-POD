#!/bin/sh
set -e

export DJANGO_SETTINGS_MODULE=core.settings.development

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

exec "$@"
