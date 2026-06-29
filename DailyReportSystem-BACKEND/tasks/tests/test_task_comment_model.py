from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from organizations.models import Membership, Organization
from projectMembers.models import ProjectMember
from projects.models import Project
from tasks.models import Task, TaskComment

User = get_user_model()

class TaskCommentModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="user@example.com",
            password="password123",
        )
        
        self.organisation = Organization.objects.create(
            name="Test Org",
            country="Uganda",
            created_by=self.user,
        )
        
        self.membership = Membership.objects.create(
            user=self.user,
            organization=self.organisation,
            role="admin",
            created_by=self.user,
        )
        
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organisation,
            owner=self.membership,
            created_by=self.user,
        )
        
        self.project_member = ProjectMember.objects.create(
            project=self.project,
            organisation=self.organisation,
            membership=self.membership,
            role="admin",
            status="active",
            created_by=self.user,
        )
        
        self.task = Task.objects.create(
            name="Test Task with comments",
            description="Task for testing comments",
            expected_hours=Decimal("4.0"),
            organisation=self.organisation,
            project=self.project,
            reported_by=self.project_member,
            created_by=self.user,
        )
        
        
    def _payload(self, **overrides):
        data = {
            "task": self.task,
            "content": "This is a test comment",
            "organisation": self.organisation,
            "membership": self.project_member,
            "created_by": self.user,
        }
        data.update(overrides)
        return data
    
    def test_create_comment_success(self):
        payload = self._payload()
        comment = TaskComment.objects.create(**payload)
        
        self.assertEqual(comment.task, self.task)
        self.assertEqual(comment.content, "This is a test comment")
        self.assertEqual(comment.organisation, self.organisation)
        self.assertEqual(comment.membership, self.project_member)
        self.assertEqual(comment.created_by, self.user)
        
    def test_content_required_for_validation(self):
        comment = TaskComment(**self._payload(content=""))
        with self.assertRaises(ValidationError):
            comment.full_clean()
            
    def test_deleting_task_cascades_comments(self):
        comment = TaskComment.objects.create(**self._payload())
        self.assertEqual(TaskComment.objects.count(), 1)
        
        self.task.delete()
        self.assertEqual(TaskComment.objects.count(), 0)