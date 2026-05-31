from django.db import transaction
from translation.tasks import trigger_translation_task


def queue_task_translation(task):
    field_names = [
        "name",
        "description"
    ]

    target_languages = ["en", "ja"]

    transaction.on_commit(
        lambda: trigger_translation_task.delay(
            scope="task",
            scope_id=task.id,
            target_languages=target_languages,
            field_names=field_names,
        )
    )

def queue_task_comment_translation(task_comment):
    field_names = [
        "content",
    ]

    target_languages = ["en", "ja"]

    transaction.on_commit(
        lambda: trigger_translation_task.delay(
            scope="task_comment",
            scope_id=task_comment.id,
            target_languages=target_languages,
            field_names=field_names,
        )
    )