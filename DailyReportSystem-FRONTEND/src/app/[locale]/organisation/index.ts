import { authFetch } from '@/utils/apiClient';
import { CreateOrganisationPayload, InviteOrganisationMemberPayloadType } from '@/_types/organisation';
import { OrganisationMemberDeactivateResponseType, organisationMemberResponseType, organisationMemberType, updateOrganisationMemberType } from "@/_types/organisation";
import { mapOrganisationMember } from "@/app/mapOrganisationMember";

export const createOrganisationApi = {
  createOrganisation: async (organisationCreateData: CreateOrganisationPayload) => {
    const response = await authFetch('/api/organisations/', {
      method: 'POST',
      body: JSON.stringify(organisationCreateData),
    });

    const createResponseData = await response.json();

    if (!response.ok) {
      throw new Error(createResponseData?.error || "Create organisation failed");
    }
    return createResponseData;
  }
};


export async function updateOrganisationMemberAPI(
  organizationId: string,
  membershipId: string,
  updates: updateOrganisationMemberType
): Promise< organisationMemberType > {
  const endpoint = `/api/organisations/${organizationId}/members/${membershipId}/`;
  
  const res = await authFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to update member: ${res.status} ${res.statusText}`
    );
  }
  const data = await res.json();
  return data.data;
}

export async function getOrganisationMembersAPI(organizationId: string): Promise<organisationMemberType[]> {
  const res = await authFetch(`/api/organisations/${organizationId}/members/`, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch members');
  }

  const data: organisationMemberResponseType[] = await res.json();
  return data.map(mapOrganisationMember);
}

export async function deactivateOrganisationMemberAPI(
  organizationId: string,
  membershipId: string
): Promise<OrganisationMemberDeactivateResponseType> {
  const endpoint = `/api/organisations/${organizationId}/members/${membershipId}/`;

  const res = await authFetch(endpoint, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to deactivate member');
  }

  const data: OrganisationMemberDeactivateResponseType = await res.json();
  return data;
}


export async function inviteOrganisationMemberAPI(
  organizationId: string,
  payload: InviteOrganisationMemberPayloadType
): Promise<organisationMemberResponseType> {
  const endpoint = `/api/organisations/${organizationId}/members/`;

  const res = await authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to invite member');
  }

  const data: organisationMemberResponseType = await res.json();
  return data;
}
