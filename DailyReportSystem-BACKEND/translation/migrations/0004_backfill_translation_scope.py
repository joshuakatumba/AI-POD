from django.db import migrations, models


def backfill_translation_scope(apps, schema_editor):
    Translation = apps.get_model("translation", "Translation")

    # Project translations
    Translation.objects.filter(
        project_id__isnull=False
    ).update(
        scope="project",
        scope_id=models.F("project_id"),
    )

    # Task translations
    Translation.objects.filter(
        task_id__isnull=False
    ).update(
        scope="task",
        scope_id=models.F("task_id"),
    )

    # Report translations
    Translation.objects.filter(
        report_id__isnull=False
    ).update(
        scope="report",
        scope_id=models.F("report_id"),
    )


class Migration(migrations.Migration):

    dependencies = [
        ("translation", "0003_translation_scope_translation_scope_id"),
    ]

    operations = [
        migrations.RunPython(
            backfill_translation_scope,
            reverse_code=migrations.RunPython.noop,
        ),
    ]