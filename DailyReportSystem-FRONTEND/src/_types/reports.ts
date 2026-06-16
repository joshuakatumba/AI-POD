import { SessionResponseType } from "@/_types/chat";
import {  OrganisationType } from "@/_types/organisation";
import { ProjectResponseType } from "@/_types/project";
import {  TaskType } from "@/_types/task";
import { TranslationType } from "@/_types/translations";


export type ReportTaskType = {
  id: string;
  session_id: string;
  report_id: string;
  organisation_id: string;
  is_validated_by_ai: boolean;
  ai_notes: string | null;
  task: TaskType | null;
};

export type ReportMemberType = {
  id: string;
  email: string;
  display_name: string;
};

export type ReportResponseType = {
  id: string;
  reference: string;
  session: SessionResponseType;
  project: ProjectResponseType
  membership: ReportMemberType;
  organisation: OrganisationType;
  generated_text: string;
  structured_data_snapshot: Record<string, unknown>;
  report_tasks: ReportTaskType[];
  created_at: string;
  modified_at: string;
  status: 'submitted' | 'draft' | 'pending';
  translations?: TranslationType[];
};

export type GetReportsParams = {
  membership?: string;
  membership_user_id?: string;
  project?: string;
  month?: string;
  page?: number;
  page_size?: number;
};

export type ReportTask = {
  id: string;
  name: string;
  status: 'done' | 'in_progress' | 'blocked' | 'pending';
  assignee: string;
  due: string;
}

export type ReportMeta = {
  title: string;
  id: string;
  owner: string;
  project: string;
  organisation: string;
  date: string;
}

export type ReportCommentMembershipType = {
  id: string;
  reference: string;
  display_name: string;
  email?: string;
};

export type ReportCommentReportType = {
  id: string;
  reference: string;
  name: string;
};

export type ReportCommentParentType = {
  id: string;
  reference: string;
};

export type ReportCommentType = {
  id: string;
  reference: string;
  content: string;
  parent?: ReportCommentParentType | null;
  organisation: string;
  membership: ReportCommentMembershipType;
  created_by: string;
  created_at: string;
  modified_at: string;
  report: ReportCommentReportType;
  translations?: TranslationType[];
  is_deleted?: boolean;
  is_deleted_at?: string | null;
  is_deleted_by_email?: string;
  is_deleted_reason?: string;
};

export type CreateReportCommentPayloadType = {
  content: string;
  parent?: string | null;
};

export type UpdateReportCommentPayloadType = {
  content?: string;
};

export type DeleteReportCommentResponseType = {
  message: string;
  comment_id: string;
  removed_by: string;
};

export type ReportCommentThreadNode = {
  id: string;
  parentId: string | null;
  comment: ReportCommentType | null;
  displayContent: string;
  children: ReportCommentThreadNode[];
  isDeletedPlaceholder: boolean;
  createdAtMs: number;
};