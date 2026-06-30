from django.db import transaction
from translation.tasks import trigger_translation_task


def queue_translation(instance, scope, field_names, target_languages=("en", "ja")):
    transaction.on_commit(
        lambda: trigger_translation_task.delay(
            scope=scope,
            scope_id=instance.id,
            target_languages=list(target_languages),
            field_names=field_names,
        )
    )


def queue_task_translation(task):
    queue_translation(task, "task", ["name", "description"])


def queue_task_comment_translation(task_comment):
    queue_translation(task_comment, "task_comment", ["content"])


def queue_project_translation(project):
    queue_translation(project, "project", ["name", "description"])


def queue_report_translation(report):
    queue_translation(report, "report", ["generated_text"])


def queue_report_comment_translation(report_comment):
    queue_translation(report_comment, "report_comment", ["content"])