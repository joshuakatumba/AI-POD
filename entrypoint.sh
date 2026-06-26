#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS" = "1" ]; then
  echo "Running migrations..."
  python manage.py migrate --noinput
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

exec "$@"