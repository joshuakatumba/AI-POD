from django.db import transaction
from translation.tasks import trigger_translation_task


def queue_project_translation(project):
    field_names = [
        "name",
        "description"
    ]

    target_languages = ["en", "ja"]

    transaction.on_commit(
        lambda: trigger_translation_task.delay(
            entity_type="project",
            entity_id=project.id,
            target_languages=target_languages,
            field_names=field_names,
        )
    )

def queue_report_translation(report):
    field_names = [
        "generated_text",
    ]

    target_languages = ["en", "ja"]

    transaction.on_commit(
        lambda: trigger_translation_task.delay(
            entity_type="report",
            entity_id=report.id,
            target_languages=target_languages,
            field_names=field_names,
        )
    )