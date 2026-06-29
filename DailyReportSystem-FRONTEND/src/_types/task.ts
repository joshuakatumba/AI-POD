import { createTaskSchema } from "@/schema/task.schema";
import { TranslationType } from "@/_types/translations";
import { z } from "zod";
import { ProjectMemberBase } from "./projectMembers";


export type ProjectType = {
  id: string;
  name: string;
  description: string;
};

export type UserType = {
  id: string;
  name: string;
  email: string;
};

export type BaseTaskType = {
  assignee: any;
  id: string;
  reference: string;
  name: string;
  description: string;
  due_date: string;
  expected_hours: number;
  status: string;
  organisation: string;
  project: ProjectType;
  assigned_to: UserType | null;
  reported_by: UserType | null;
  created_by: string;
  created_at: string;
  closed_at: string | null;
  translations?: TranslationType[];
  priority: string;
  category: string;
  comments_count?: number;
  attachments_count?: number;
};

export type TaskType = BaseTaskType
export type TaskResponseType = BaseTaskType

export type ISODateString = string;

// todo: find where this is used and remove it
export type ProjectMember = {
  id: string;
  email: string;
};

export const TASK_STATUSES = [
  'backlog', 'ready', 'in_progress', 'blocked',
  'review', 'testing', 'done', 'deployed', 'cancelled'
] as const;

export type TaskStatus = typeof TASK_STATUSES[number];

export const STATUS_OPTIONS = TASK_STATUSES.map(value => ({
  value,
  label: `form.status.options.${value}` as const,
}));

export const TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];

export const TASK_CATEGORIES = ['feature', 'bug', 'improvement', 'documentation', 'other'] as const;
export type TaskCategory = typeof TASK_CATEGORIES[number];

export type CreateTaskModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CreateTaskFormData) => Promise<void>;
  projectMembers: ProjectMemberBase[];
  canCreateTask?: boolean;
};

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;

export type CreateTaskPayload = {
  name: string;
  description: string;
  status: TaskStatus;
  assigned_to: string | null | undefined;
  due_date?: ISODateString;
  expected_hours: number;
  priority: TaskPriority;
  category: TaskCategory;
};

export type EditTaskPayloadType = {
  name?: string;
  description?: string;
  due_date?: string;
  expected_hours?: number;
  status?: string;
  assigned_to?: string | null | undefined;
  priority?: string;
  category?: string;
};

export type TaskTypeParams = {
  project_id?: string;
  status?: string;
  assigned_to?: string;
  reported_by?: string;
  project?: string;
  high_priority?: boolean;
  limit?: number;
  page?: number;
}

export type TaskCommentMembershipType = {
  id: string;
  reference: string;
  display_name: string;
};

export type TaskCommentTaskType = {
  id: string;
  reference: string;
  name: string;
};

export type TaskCommentType = {
  id: string;
  reference: string;
  content: string;
  organisation: string;
  membership: TaskCommentMembershipType;
  created_by: string;
  created_at: string;
  modified_at: string;
  task?: TaskCommentTaskType;
  translations?: TranslationType[];
};

export type CreateTaskCommentPayloadType = {
  content: string;
};

export type UpdateTaskCommentPayloadType = {
  content?: string;
};

export type DeleteTaskCommentResponseType = {
  message: string;
  comment_id: string;
  removed_by: string;
};

export type TaskAttachmentType = {
  title: string;
  url: string;
  type: 'github' | 'file' | 'link' | 'document';
  id: string;
};

export type CreateTaskAttachmentPayloadType = {
  title: string;
  url: string;
  type: TaskAttachmentType['type'];
};

export type DeleteTaskAttachmentResponseType = {
  message: string;
  attachment_id: string;
};

export type CommentThreadNode = {
  id: string;
  parentId: string | null;
  comment: TaskCommentType | null;
  displayContent: string;
  children: CommentThreadNode[];
  isDeletedPlaceholder: boolean;
  createdAtMs: number;
};

export type DeleteTaskResponseType = {
  detail: string;
  project_id: string;
  deleted_by: string;
};
