import { AiModelResponseType, AiModelType, AiWorkflowUpdatePayloadType, CreateAIModelPayloadType, CreateWorkflowPayloadType, DeleteAiModelResponseType, EditAIModelPayloadType, WorkflowResponseType } from "@/_types/admin";
import { authFetch } from "@/utils/apiClient";

export async function getAdminWorkflowsAPI(): Promise<WorkflowResponseType[]> {
  const res = await authFetch(`/api/sysadmin/ai-workflows`, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch workflows');
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

export async function createWorkflowAPI( payload: CreateWorkflowPayloadType): Promise<WorkflowResponseType> {
  const endpoint = '/api/sysadmin/ai-workflows';

  const res = await authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || `Failed to create agent.`);
  }

  const data: WorkflowResponseType = await res.json();
  return data;
}

export async function updateWorkflowAPI(
  workflowId: string,
  updates: AiWorkflowUpdatePayloadType
): Promise<WorkflowResponseType> {
  const endpoint = `/api/sysadmin/ai-workflows/${workflowId}`;

  const res = await authFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || "Failed to update workflow");
  }

  const data: WorkflowResponseType = await res.json();

  return data;
}


// ------------------------- Ai Model API Calls ------------------------------
export async function createAiModelAPI(
  payload: CreateAIModelPayloadType
): Promise<AiModelResponseType> {
  const endpoint = '/api/sysadmin/ai-models/';

  const res = await authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || `Failed to create project.`);
  }

  const data: AiModelResponseType = await res.json();
  return data;
}

export async function deleteAiModelAPI(modelId: string): Promise<DeleteAiModelResponseType> {
  const endpoint = `/api/sysadmin/ai-models/${modelId}/`;

  const res = await authFetch(endpoint, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to deactivate member');
  }

  const data: DeleteAiModelResponseType = await res.json()
  return data;
}

export async function updateAiModelAPI(
  modelId: string,
  updates: EditAIModelPayloadType
): Promise<AiModelResponseType> {
  const endpoint = `/api/sysadmin/ai-models/${modelId}/`;

  const res = await authFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || "Failed to update project");
  }

  const data: AiModelResponseType = await res.json();

  return data;
}

export async function getAIModels(): Promise<AiModelType[]> {
  const endpoint = '/api/sysadmin/ai-models/';

  const res = await authFetch(endpoint, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch AI models');
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

export async function archiveWorkflowAPI(workflowId: string): Promise<WorkflowResponseType> {
  const endpoint = `/api/sysadmin/ai-workflows/${workflowId}`;

  const res = await authFetch(endpoint, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to archive workflow');
  }

  const data: WorkflowResponseType = await res.json()
  return data;
}