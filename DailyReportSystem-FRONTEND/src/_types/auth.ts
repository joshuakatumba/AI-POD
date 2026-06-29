import { Dispatch, SetStateAction } from "react";
import { Role } from "@/_types/organisation";

/* ================== API SHAPES ================== */

export interface OrganisationMembership {
  id: string;
  organization_id: string;
  organization_name: string;
  display_name: string;
  preferred_language: string | null;
  role: string;
  is_current: boolean;
  joined_at: string;
  last_accessed_at: string;
}

export interface User {
  user_id: string;
  role: Role;
  email: string;
  full_name: string;
  preferred_language: string;
  organisation: string;
  membership: string;
  super_admin: boolean
  is_staff: boolean;
  memberships: OrganisationMembership[];
}

export interface LoginResponse {
  user_id: string;
  email: string;
  full_name: string;
  preferred_language: string;
  organisation: string;
  role: string;
  tokens: {
    refresh: string;
    access: string;
  };
  memberships: OrganisationMembership[];
}

export interface CurrentUserResponse {
  user_id: string;
  email: string;
  full_name: string;
  preferred_language: string;
  super_user: boolean;
  memberships: {
    organization_id: string;
    organization_name: string;
    role: string;
    is_current: boolean;
    joined_at: string;
    last_accessed_at: string;
  }[];
}

/* ================== CONTEXT ================== */

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isSideBarOpen: boolean;
}

export interface AuthContextType extends AuthState {
  setUser: Dispatch<SetStateAction<User | null>>;
  setMemberships: Dispatch<SetStateAction<OrganisationMembership[]>>;
  memberships: OrganisationMembership[];
  setOrganisation: Dispatch<SetStateAction<string>>;
  organisation: string;
  login: (data: LoginResponse & { user: User }) => void;
  logout: (redirectUrl?: string) => Promise<void>;
  isLoading: boolean;
  setIsSideBarOpen: Dispatch<SetStateAction<boolean>>;
}


export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  preferred_language: string
};

export type OrgSwitchPayload = {
  organisation_id: string;
};

export type PasswordResetRequestPayload = {
  email: string;
  preferred_language?: string;
};

export type PasswordResetRequestResponse = {
  message: string;
  detail?: string;
};

export type PasswordResetConfirmPayloadType = {
  reset_token: string;
  uid: string;
  new_password: string;
};

export type PasswordResetConfirmResponseType = {
  message: string;
  detail?: string;
};
