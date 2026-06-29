export type CreateProjectMemberPayloadType = {
    email: string;
    role: string;
}

export type ProjectMemberBase = {
  id: string;
  reference: string;
  member_id: string;
  member_name: string;
  member_email: string;
  role: string;
  status: string;
  is_active: boolean;
  is_deleted: boolean;
};

export type ProjectMemberType = ProjectMemberBase;

export type ProjectMemberResponseType = ProjectMemberBase;

export type UpdateProjectMemberResponseType = ProjectMemberBase;

export type UpdateProjectMemberPayloadType = {
  role: string;
}

export type DeleteProjectMemberResponseType = {
  project_id: string;
  member_id: string;
}