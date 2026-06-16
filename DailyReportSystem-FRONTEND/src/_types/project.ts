import { ProjectMemberType } from "@/_types/projectMembers";
import { TranslationType } from "@/_types/translations";

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'inactive' | 'pending';

export type ProjectVisibility = 'Team' | 'Organisation';

export type ProgressDataType = {
  backlog?: number;
  done?: number;
  review?: number;
  testing?: number;
  in_progress?: number;
  deployed?: number;
  closed?: number;
  ready?: number;
  todo?: number;
  blocked?: number;
  cancelled?: number;
};

export type ProjectResponseType = {
  id: string;
  reference: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  start_date?: string | null;
  end_date?: string | null;
  owner_name: string;
  members: ProjectMemberType[];
  visibility: ProjectVisibility;
  is_active: boolean;
  is_deleted: boolean;
  description?: string;
  progress_data: ProgressDataType;
  translations?: TranslationType[];
};

export type CreateProjectPayloadType = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  members?: string[];
  visibility: 'team' | 'organisation';
};

export type EditProjectPayloadType = {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
};

export type DeleteProjectResponseType = {
  detail: string;
  project_id: string;
  deleted_by: string;
}

export type GetProjectsParams = {
  search?: string;
  page?: number;
  page_size?: number;
  member_user_id?: string;
};
