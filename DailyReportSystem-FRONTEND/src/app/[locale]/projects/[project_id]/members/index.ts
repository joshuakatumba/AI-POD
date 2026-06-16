import { CreateProjectMemberPayloadType, DeleteProjectMemberResponseType, ProjectMemberResponseType, UpdateProjectMemberPayloadType, UpdateProjectMemberResponseType } from "@/_types/projectMembers";
import { authFetch } from "@/utils/apiClient";


export async function createProjectMemberApi(projectId: string, projectMemberPayload: CreateProjectMemberPayloadType): Promise<ProjectMemberResponseType> {
    const endpoint = `/api/projects/${projectId}/members/`;

    const res = await authFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(projectMemberPayload),
    });

    if (!res.ok) {
        throw new Error(
            `Failed to create project member: ${res.status} ${res.statusText}`
        );
    }

    const data: ProjectMemberResponseType = await res.json();
    return data;
}


export async function getProjectMembersAPI(projectId: string): Promise<ProjectMemberResponseType[]> {
    const endpoint = `/api/projects/${projectId}/members/`;

    const res = await authFetch(endpoint, {
        method: 'GET',
    });

    if (!res.ok) {
        throw new Error(
            `Failed to create project member: ${res.status} ${res.statusText}`
        );
    }

    const data: ProjectMemberResponseType[] = await res.json();
    return data;
}

export async function updateProjectMemberAPI(
    project_id: string | undefined,
    memberId: string,
    payload: UpdateProjectMemberPayloadType,
): Promise<UpdateProjectMemberResponseType> {
    const endpoint = `/api/projects/${project_id}/members/${memberId}/`

    const res = await authFetch(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || 'Failed to update member role');
    }

    const data: UpdateProjectMemberResponseType = await res.json();
    return data;
}

export async function deleteProjectMemberAPI(project_id: string | undefined, member_id: string): Promise<DeleteProjectMemberResponseType> {
    const endpoint = `/api/projects/${project_id}/members/${member_id}/`

    const res = await authFetch(endpoint, {
        method: 'DELETE',
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || 'Failed to delete project member');
    }

    const data: DeleteProjectMemberResponseType = await res.json();
    return data;
}
