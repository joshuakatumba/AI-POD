export const ORGANISATION_TYPES = ['company', 'ngo', 'startup', 'community', 'school'] as const;

export type organisationType = (typeof ORGANISATION_TYPES)[number];

export interface CreateOrganisationPayload {
  name: string;
  type: string;
  description: string;
  email: string;
  country: string;
  invited_members?: string[];
}

export interface InviteResults {
  added?: {
    email: string;
    membership_id: string;
  }[];
  failed?: {
    email: string;
    error: string;
  }[];
}

export interface CreateOrganisationResponse {
  full_name: string;
  preferred_language: string;
  id?: string;
  data?: {
    id?: string;
    organisation?: {
      id: string;
    };
    invited_members_added?: InviteResults['added'];
    invited_members_failed?: InviteResults['failed'];
  };
  tokens?: any;
  user_id?: string;
  email?: string;
  role?: string;
  organisation?: string;
  memberships?: any[];
  user?: any;
}

export type Role = 'admin' | 'member';
export type Status = 'active' | 'inactive';
export type ProjectRoleType = 'Product owner' | 'Manager' | 'Contributor' | 'Viewer';

export type organisationMemberType = {
  id: string;
  user_id: string;
  display_name?: string;
  preferred_language?: string;
  email: string;
  dateJoined: string | undefined;
  status: Status;
  role: Role;
};

export type updateOrganisationMemberType = { role?: Role; display_name?: string; preferred_language?: string; };

export type organisationMemberResponseType = {
  user_id: string;
  id: string;
  display_name: string;
  preferred_language: string | null;
  user_email: string;
  role: Role;
  is_active: boolean;
  joined_at: string;
};

export type OrganisationMemberDeactivateResponseType = {
  massage: string,
  membership_id: string
}

export type InviteOrganisationMemberPayloadType = {
  email: string;
  role: string
}

export type OrganisationType = {
  id: string;
  reference: string;
  name: string;
  slug: string;
  type: organisationType;
  description: string;
  email: string;
  country: string;
  member_count: number;
  creator: {
    display_name: string,
    preferred_language: string,
    email: string
  };
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  modified_at: string;
};

export type EditOrganisationPayload = {
  name?: string;
  organisation_email?: string;
  country?: string;
  status?: 'active' | 'inactive';
};
