from django.db import migrations, models
from django.db.models.functions import Coalesce


def backfill_cancelled_at(apps, schema_editor):
    Task = apps.get_model("tasks", "Task")
    Task.objects.filter(status="cancelled", cancelled_at__isnull=True).update(
        cancelled_at=Coalesce("is_deleted_at", "modified_at")
    )


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0007_remove_taskattachment_task_attach_task_id_637c08_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="cancelled_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(backfill_cancelled_at, migrations.RunPython.noop),
    ]
