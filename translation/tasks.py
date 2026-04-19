import logging

from celery import shared_task
from django.apps import apps
from translation.services import persist_translations, trigger_translation
from django.core.exceptions import ObjectDoesNotExist

logger = logging.getLogger(__name__)

ENTITY_MODEL_MAP = {
    "project": ("projects", "Project", "project"),
    "task": ("tasks", "Task", "task"),
}

@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="translation.trigger_translation_task",
)
def trigger_translation_task(
    self,
    entity_type,
    entity_id,
    target_languages,
    field_names,
):
    try:
        app_label, model_name, scope = ENTITY_MODEL_MAP[entity_type]
    except KeyError:
        logger.error(
            "Unsupported entity type received",
            extra={
                "entity_type": entity_type,
                "entity_id": entity_id,
            },
        )
        raise ValueError(f"Unsupported entity type: {entity_type}")

    entity_model = apps.get_model(app_label, model_name)

    try:
        entity = entity_model.objects.get(id=entity_id)
    except ObjectDoesNotExist:
        logger.warning(
            "Entity not found for translation task",
            extra={
                "entity_type": entity_type,
                "entity_id": entity_id,
                "model": f"{app_label}.{model_name}",
            },
        )

        return {
            "status": "not_found",
            "entity_type": entity_type,
            "entity_id": entity_id,
            "scope": scope,
        }

    logger.info(
        "Translation task started",
        extra={
            "entity_type": entity_type,
            "entity_id": entity_id,
            "target_languages": target_languages,
            "field_names": field_names,
        },
    )

    objects = trigger_translation(entity, target_languages, field_names)
    persist_translations(scope, objects)

    return {
        "status": "success",
        "entity_type": entity_type,
        "entity_id": entity_id,
        "scope": scope,
        "target_languages_count": len(target_languages),
        "fields_translated": field_names,
        "translations_created": len(objects) if objects else 0,
    }
