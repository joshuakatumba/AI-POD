import { organisationType } from "@/_types/organisation";

type MembershipRole = 'admin' | 'member';

type BaseMembershipType = {
  id: string;
  display_name: string;
  role: MembershipRole;
};

export type AdminUserMembershipType = BaseMembershipType & {
  organization_id: string;
  organization_name: string;
  joined_at: string;
  last_accessed_at: string | null;
};

export type AdminOrganisationMembershipType = BaseMembershipType & {
  email: string;
  is_active: boolean;
};

export type AdminUserType = {
  id: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  memberships: AdminUserMembershipType[];
};

export type UpdateAdminUserPayloadType = {
  is_staff: boolean;
  is_superuser: boolean;
};

export type DeactivateAdminUserPayloadType = {
  is_active: boolean;
}

export type AdminOrganisationType = {
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
    email: string
  };
  memberships: AdminOrganisationMembershipType[];
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  modified_at: string;
};

export type DeleteAdminOrganisationResponseType = {
  details: string;
  organization_id: string;
  deleted_by: string;
}

export type AiModelType = {
  id: string;
  reference: string;
  name: string;
  provider: string;
  api_key?: string;
  is_active: boolean;
  created_at: string;
  modified_at: string;
};

export type ProviderType = 'openai' | 'anthropic' | 'cohere' | 'gemini';

export type CreateAIModelPayloadType = {
  name: string;
  provider: ProviderType;
  api_key?: string | null;
};

export type EditAIModelPayloadType = {
  name?: string;
  provider?: string;
  api_key?: string;
  is_active?: boolean;
};

export type AiModelResponseType = {
  id: string;
  reference: string;
  name: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  modified_at: string;
}

export type DeleteAiModelResponseType = {
  detail: string;
  model_id: string;
  deleted_by: string;
}

export type WorkflowResponseType = {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  category: string;
  system_prompt: string;
  ai_model: string;
  ai_model_name: string;
  is_active: boolean;
  created_at: string;
  modified_at: string;
};

export type CreateWorkflowPayloadType = {
  name: string;
  description: string;
  category: string;
  system_prompt: string;
  ai_model: string;
}

export type AiWorkflowUpdatePayloadType = {
  name?: string;
  description?: string;
  category?: string;
  system_prompt?: string;
  ai_model?: string;
}

export type AdminEditOrganisationPayloadType = {
  name: string;
  email?: string;
  country?: string;
  is_active?: boolean;
};