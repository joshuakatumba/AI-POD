import pytest
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from projectMembers.models import ProjectMember
from tasks.models import Task
from projects.models import Project
from organizations.models import Organization, Membership

from translation import services

User = get_user_model()

pytestmark = pytest.mark.django_db


# -----------------------
# Fixtures (REAL DB objects)
# -----------------------
@pytest.fixture
def user():
    return User.objects.create_user(
        email="admin@example.com",
        password="password123",
    )


@pytest.fixture
def organization(user):
    return Organization.objects.create(
        name="Acme Org",
        country="Uganda",
        created_by=user,
    )


@pytest.fixture
def membership(user, organization):
    return Membership.objects.create(
        user=user,
        organization=organization,
        role="admin",
        created_by=user,
    )

@pytest.fixture
def project(user, organization, membership):
    return Project.objects.create(
        name="Project One",
        organization=organization,
        owner=membership,
        created_by=user,
    )

@pytest.fixture
def project_membership(user, project, membership):
    return ProjectMember.objects.create(
        project=project,
        organisation=project.organization,
        membership=membership,
        role="admin",
        status="active",
        created_by=user,
    )

@pytest.fixture
def task(user, organization, project, project_membership):
    return Task.objects.create(
        name="Task One",
        organisation=organization,
        project=project,
        reported_by=project_membership,
        expected_hours=2,
        created_by=user,
    )


# -----------------------
# extract_entity_fields
# -----------------------
def test_extract_entity_fields(task):
    result = services.extract_entity_fields(
        task,
        ["name", "expected_hours", "missing"],
    )

    assert "name" in result


# -----------------------
# build_translation_objects (NO FAKE ENTITY)
# -----------------------
def test_build_translation_objects(task, user):
    item = MagicMock()
    item.field_name = "name"
    item.target_language = "fr"
    item.source_language = "en"
    item.translated_text = "Bonjour"
    item.intended_text = "Hello"

    with patch("translation.services.generate_reference", return_value="TRN-1"), \
         patch("translation.services.uuid.uuid5"):

        result = services.build_translation_objects(
            "task",
            task,
            [item],
            created_by=user,
        )

    assert result[0].scope_id == task.id
    assert result[0].created_by == user


# -----------------------
# trigger_translation (SERVICE TEST)
# -----------------------
@patch("translation.services.AIWorkflow")
@patch("translation.services.TranslationAgentRunner")
def test_trigger_translation_service_layer(
    mock_runner,
    mock_workflow,
    task,
    user,
):
    mock_workflow.objects.get.return_value = MagicMock()

    mock_agent = MagicMock()
    mock_agent.run_sync.return_value.output = [
        MagicMock(
            field_name="name",
            target_language="fr",
            source_language="en",
            translated_text="Bonjour",
            intended_text="Hello",
        )
    ]

    mock_runner.return_value.agent = mock_agent

    with patch("translation.services.uuid.uuid5", return_value="uuid"), \
         patch("translation.services.generate_reference", return_value="TRN-123"):

        result = services.trigger_translation(
            entity=task,
            target_languages=["fr"],
            field_names=["name"],
            scope="task",
        )

    assert len(result) == 1
    assert result[0].scope_id == task.id


# -----------------------
# Celery task test (FIXED ENTITY_MODEL_MAP PATCH)
# -----------------------
@patch("translation.tasks.persist_translations")
@patch("translation.tasks.trigger_translation")
@patch("django.apps.apps.get_model")
def test_trigger_translation_task_success(
    mock_get_model,
    mock_trigger_translation,
    mock_persist,
    task,
):
    from translation.tasks import trigger_translation_task


    mock_model = MagicMock()
    mock_model.objects.get.return_value = task
    mock_get_model.return_value = mock_model

    mock_trigger_translation.return_value = ["obj1", "obj2"]

    result = trigger_translation_task(
        scope="task",
        scope_id=1,
        target_languages=["fr"],
        field_names=["name"],
    )

    assert result["status"] == "success"
    assert result["translations_created"] == 2


# -----------------------
# not found case
# -----------------------
@patch("django.apps.apps.get_model")
def test_trigger_translation_task_not_found(mock_get_model):
    from django.core.exceptions import ObjectDoesNotExist
    from translation.tasks import trigger_translation_task

    mock_model = MagicMock()
    mock_model.objects.get.side_effect = ObjectDoesNotExist()
    mock_get_model.return_value = mock_model

    result = trigger_translation_task(
        scope="task",
        scope_id=999,
        target_languages=["fr"],
        field_names=["name"],
    )

    assert result["status"] == "not_found"