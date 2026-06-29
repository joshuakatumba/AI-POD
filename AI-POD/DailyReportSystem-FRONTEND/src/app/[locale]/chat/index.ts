import { WorkflowResponseType } from "@/_types/admin";
import { ChatStreamPayload, CreateReportSessionPayloadType, SessionResponseType, SessionType } from "@/_types/chat";
import { authFetch } from "@/utils/apiClient";

export async function createSessionAPI(
  payload: CreateReportSessionPayloadType
): Promise<SessionResponseType> {
  const endpoint = '/api/chat/';

  const res = await authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || `Failed to create project.`);
  }

  const data: SessionResponseType = await res.json();
  return data;
}

export async function getSessionByIdAPI(sessionId: string): Promise<SessionType> {
  const res = await authFetch(`/api/chat/${sessionId}/`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch project');
  }

  const data: SessionType = await res.json();
  return data;
}

export async function chatStreamAPI(
  session_id: string,
  payload: ChatStreamPayload,
): Promise<Response> {
  const endpoint = `/api/chat/${session_id}/stream/`;

  const res = await authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to stream chat.');
  }

  // Return raw response so caller can handle streaming (reader, etc.)
  return res;
}

export async function getChatWorkflowsAPI(): Promise<WorkflowResponseType[]> {
  const res = await authFetch(`/api/chat/ai-workflows/`, { method: 'GET' });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch workflows');
  }

  const data = await res.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;

  return [];
}
