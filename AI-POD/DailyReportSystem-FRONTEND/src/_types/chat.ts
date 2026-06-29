import { TaskType } from "./task";

export type MessageType = {
  id: string;
  content: string;
  role: 'user' | 'ai';
};

export type SessionStatus = 'ingesting' | 'interviewing' | 'drafting'| 'review' | 'archived' | string;
export type SessionTypeTypes = 'report_generation' | string;
export type MessageRole = 'system' | 'assistant' | 'user' | string;

export type CreateReportSessionPayloadType = {
  project_id: string;
  workflow_id: string;
  task_ids: string[];
  session_type: SessionTypeTypes;
};

export type SessionResponseType = {
  id: string;
  reference: string;
  title: string;
  status: SessionStatus;
};

export type SessionTaskItemType = {
  id: string;
  task: TaskType;
  is_validated_by_ai: boolean;
  ai_notes: string;
};

export type SessionMessageType = {
  id: string;
  reference: string;
  role: MessageRole;
  content: string;
  created_at: string;
  modified_at: string;
  metadata: Record<string, unknown>;
};

export type SessionType = {
  id: string;
  reference: string;
  title: string;
  session_type: SessionTypeTypes;
  session_tasks: SessionTaskItemType[];
  status: SessionStatus;
  project: string;
  project_name: string;
  workflow: string;
  workflow_name: string;
  organisation: string;
  organisation_name: string;
  created_at: string;
  modified_at: string;
  messages: SessionMessageType[];
}

export type ChatStreamPayload = {
  text: string;
};
