import { authFetch } from '@/utils/apiClient';
import {
  AdminOrganisationType,
  DeleteAdminOrganisationResponseType,
  AdminOrganisationMembershipType,
  AdminEditOrganisationPayloadType,
} from '@/_types/admin';

export async function getAdminOrganisationsAPI(): Promise<AdminOrganisationType[]> {
  const endpoint = `/api/sysadmin/organizations/`;
  const res = await authFetch(endpoint, {
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch organisations');
  }
  const data: AdminOrganisationType[] = await res.json();
  return data;
}

export async function deleteOrganisationAPI(
  organization_id: string
): Promise<DeleteAdminOrganisationResponseType> {
  const endpoint = `/api/sysadmin/admin/${organization_id}/`;

  const res = await authFetch(endpoint, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to delete organisation details');
  }

  const data: DeleteAdminOrganisationResponseType = await res.json();
  return data;
}

export async function getAdminOrganisationMembersAPI(
  organization_id: string
): Promise<AdminOrganisationMembershipType[]> {
  const endpoint = `/api/sysadmin/organizations/${organization_id}/`;
 
  const res = await authFetch(endpoint, {
    method: 'GET',
  });
 
  if (!res.ok) {
    throw new Error('Failed to fetch organisation members');
  }
 
  const data: AdminOrganisationMembershipType[] = await res.json();
  return data;
}

export async function updateOrganisationAPI(
  organization_id: string,
  payload: AdminEditOrganisationPayloadType
): Promise<AdminOrganisationType> {

  const endpoint = `/api/sysadmin/admin/${organization_id}/`;

  const res = await authFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to update organisation');
  }

  const data: AdminOrganisationType = await res.json();

  return data;
}
