import { LoginPayload, LoginResponse, OrgSwitchPayload, RegisterPayload, PasswordResetRequestPayload, PasswordResetRequestResponse, PasswordResetConfirmPayloadType, PasswordResetConfirmResponseType } from '@/_types/auth';
import { organisationMemberResponseType, organisationMemberType } from '@/_types/organisation';
import { apiFetch, authFetch } from '@/utils/apiClient';
import { updateOrganisationMemberType } from '@/_types/organisation';

function getErrorMessage(payload: any, fallback: string) {
  return payload?.detail || payload?.error || payload?.message || fallback;
}

function createApiError(message: string, statusCode: number, errorCode: string | null, responseBody: unknown) {
  return Object.assign(new Error(message), {
    statusCode,
    errorCode,
    responseBody,
  });
}

export async function loginApi(credentials: LoginPayload) {
  const res = await apiFetch('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  const data = await res.json();

  if (!res.ok) {
    throw createApiError(
      getErrorMessage(data, 'Login failed'),
      res.status,
      data?.error_code || null,
      data,
    );
  }

  return data;
}

export async function registerApi(credentials: RegisterPayload) {
  const res = await apiFetch('/api/auth/signup/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Register failed");
  }

  return data;
}

export async function orgSwitchApi(payload: OrgSwitchPayload) {
  const res = await authFetch(`/api/auth/organization/switch/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Organization switch failed");
  }

  return data;
}

export async function requestPasswordResetApi(payload: PasswordResetRequestPayload): Promise<PasswordResetRequestResponse> {
  const res = await apiFetch(`/api/auth/password-reset/request/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw createApiError(
      getErrorMessage(data, 'Password reset request failed'),
      res.status,
      data?.error_code || null,
      data,
    );
  }

  return data;
}

export async function confirmPasswordResetApi(payload: PasswordResetConfirmPayloadType): Promise<PasswordResetConfirmResponseType> {
  const res = await apiFetch(`/api/auth/password-reset/confirm/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw createApiError(
      getErrorMessage(data, 'Password reset confirmation failed'),
      res.status,
      data?.error_code || null,
      data,
    );
  }

  return data;
}
