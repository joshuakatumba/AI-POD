# translation/services.py

import json
import uuid

from core.utils import generate_reference
from translation.models import Translation
from orchestrator.core import TranslationAgentRunner
from sysadmin.models import AIWorkflow


SCOPE_MODEL_FIELD = (
    "project",
    "task",
    "report"
)


def extract_entity_fields(entity, field_names: list[str]) -> dict:
    """
    Extract non-empty fields from an entity for translation input.
    """
    return {
        field: value
        for field in field_names
        if (value := getattr(entity, field, None)) not in (None, "")
    }


def build_translation_objects(scope, entity, translations: list, created_by=None) -> list[Translation]:
    """
    Convert agent output into Translation model instances.
    """
    if scope not in SCOPE_MODEL_FIELD:
        raise ValueError(f"Invalid scope: {scope}")
    
    return [
        Translation(**{
            "scope": scope,
            "scope_id": entity.id,
            "field_name": item.field_name,
            "target_language": item.target_language,
            "source_language": item.source_language,
            "original_text": getattr(entity, item.field_name, None),
            "translated_text": item.translated_text,
            "intended_text": item.intended_text,
            "created_by": created_by,
            "reference": generate_reference(
                prefix="TRN",
                entity_uuid=uuid.uuid5(
                    uuid.NAMESPACE_DNS,
                    f"{entity.pk}:{item.field_name}:{item.target_language}",
                ),
            ),
        })
        for item in translations
    ]


def bulk_upsert_translations(objects: list[Translation]):
    """
    Insert or update translations in bulk using polymorphic scope system.
    """
    if not objects:
        return

    Translation.objects.bulk_create(
        objects,
        update_conflicts=True,
        unique_fields=[
            "scope",
            "scope_id",
            "field_name",
            "target_language",
        ],
        update_fields=[
            "source_language",
            "original_text",
            "translated_text",
            "intended_text",
        ],
    )


def trigger_translation(entity, target_languages: list[str], field_names: list[str], scope: str) -> list[Translation]:
    """
    Run translation workflow and return Translation objects (not persisted).
    """
    workflow = AIWorkflow.objects.get(category="translation", is_active=True)
    agent_runner = TranslationAgentRunner(workflow=workflow)

    input_data = {
        "data": extract_entity_fields(entity, field_names),
        "target_languages": target_languages,
    }

    result = agent_runner.agent.run_sync(json.dumps(input_data))
    translations = result.output or []

    return build_translation_objects(
        scope=scope,
        entity=entity,
        translations=translations,
        created_by=getattr(entity, "created_by", None),
    )


def persist_translations(scope: str, objects: list[Translation]):
    """
    Persist translation objects with conflict resolution.
    """
    bulk_upsert_translations(objects)
