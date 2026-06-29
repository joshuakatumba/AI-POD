import { CreateProjectPayloadType, ProjectResponseType, EditProjectPayloadType, DeleteProjectResponseType, GetProjectsParams } from '@/_types/project';
import { DeleteProjectMemberResponseType } from '@/_types/projectMembers';
import { authFetch } from '@/utils/apiClient';

export async function getProjectsAPI(params?: GetProjectsParams): Promise<ProjectResponseType[]> {
  const searchParams = new URLSearchParams();

  if (params?.search) {
    searchParams.append("search", params.search);
  }
  if (params?.member_user_id) {
    searchParams.append("member_user_id", params.member_user_id);
  }

  if (params?.page) {
    searchParams.append("page", String(params.page));
  }

  if (params?.page_size) {
    searchParams.append("page_size", String(params.page_size));
  }

  const queryString = searchParams.toString();
  const endpoint = queryString
    ? `/api/projects/?${queryString}`
    : `/api/projects/`;

  const res = await authFetch(endpoint, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch projects');
  }

  const data = await res.json();

  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data.results)) {
    return data.results;
  }

  return [];
}

export async function deleteProjectAPI(id: string): Promise<DeleteProjectResponseType> {
  const endpoint = `/api/projects/${id}/`;

  const res = await authFetch(endpoint, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to deactivate member');
  }

  const data: DeleteProjectResponseType = await res.json()
  return data;
}

export async function createProjectAPI(
  payload: CreateProjectPayloadType
): Promise<ProjectResponseType> {
  const endpoint = '/api/projects/';

  const res = await authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || `Failed to create project.`);
  }

  const data: ProjectResponseType = await res.json();
  return data;
}

export async function updateProjectAPI(
  projectId: string,
  updates: EditProjectPayloadType
): Promise<ProjectResponseType> {
  const endpoint = `/api/projects/${projectId}/`;

  const res = await authFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || "Failed to update project");
  }

  const data: ProjectResponseType = await res.json();

  return data;
}

export async function getProjectByIdAPI(project_id: string): Promise<ProjectResponseType> {
  const res = await authFetch(`/api/projects/${project_id}/`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch project');
  }

  return res.json();
}
