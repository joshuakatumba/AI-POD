# core/celery.py

import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

app = Celery("core")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()

from celery.schedules import crontab

app.conf.beat_schedule = {
    'send-deadline-reminders-every-day': {
        'task': 'notifications.send_deadline_reminders_task',
        'schedule': crontab(hour=8, minute=0),
    },
}