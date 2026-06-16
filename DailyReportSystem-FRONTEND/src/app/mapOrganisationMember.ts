import { organisationMemberResponseType, organisationMemberType, Status } from '@/_types/organisation'; 

/* ---------------- mapper ---------------- */
export function mapOrganisationMember(data: organisationMemberResponseType): organisationMemberType {
  return {
    user_id: data.user_id,
    display_name: data.display_name,
    id: data.id,
    email: data.user_email,
    role: data.role as organisationMemberType['role'],
    status: data.is_active ? 'active' : 'inactive' as organisationMemberType['status'],
    dateJoined: data.joined_at.split('T')[0],
  };
}