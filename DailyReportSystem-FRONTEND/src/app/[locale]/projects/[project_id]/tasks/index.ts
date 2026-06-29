import { CreateTaskFormData, CreateTaskPayload, TaskResponseType, EditTaskPayloadType, DeleteTaskResponseType, TaskTypeParams, TaskAttachmentType, CreateTaskAttachmentPayloadType, DeleteTaskAttachmentResponseType } from '@/_types/task';
import { authFetch } from "@/utils/apiClient";

export async function getAllTasksAPI(params: TaskTypeParams): Promise<TaskResponseType[]> {
  const searchParams = new URLSearchParams();

  if (params.project_id) searchParams.append("project_id", params.project_id);
  if (params.status) searchParams.append("status", params.status);
  if (params.assigned_to) searchParams.append("assigned_to", params.assigned_to);
  if (params.reported_by) searchParams.append("reported_by", params.reported_by);
  
  if (params.project) searchParams.append("project", params.project);
  if (params.high_priority !== undefined)
    searchParams.append("high_priority", String(params.high_priority));
  if (params.limit) searchParams.append("limit", String(params.limit));
  if (params.page) searchParams.append("page", String(params.page));

  const endpoint = `/api/projects/tasks/?${searchParams.toString()}`;

  const res = await authFetch(endpoint, {
    method: "GET",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch tasks');
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

export async function getProjectTasksAPI(projectId: string): Promise<TaskResponseType[]> {
  const endpoint = `/api/projects/${projectId}/tasks/`;

  const res = await authFetch(endpoint, {
    method: 'GET',
  });

  if (!res.ok) {
    throw new Error(
      `Failed to create project member: ${res.status} ${res.statusText}`
    );
  }

  const data: TaskResponseType[] = await res.json();
  return data;
}

export async function updateTaskAPI(
  projectId: string,
  taskId: string,
  updates: EditTaskPayloadType
): Promise<TaskResponseType> {
  const endpoint = `/api/projects/${projectId}/tasks/${taskId}/`;

  const res = await authFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to update task details');
  }

  const data: TaskResponseType = await res.json();

  return data;
}

export async function createTaskAPI(
  projectId: string,
  payload: CreateTaskFormData
): Promise<TaskResponseType> {
  const res = await authFetch(`/api/projects/${projectId}/tasks/`, {
    method: 'POST',
    body: JSON.stringify(mapCreateTaskFormToPayload(payload)),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to create task');
  }

  const data: TaskResponseType = await res.json();
  return data;
}


function mapCreateTaskFormToPayload(
  payload: CreateTaskFormData
): CreateTaskPayload {
  return {
    name: payload.title,
    description: payload.description ?? "",
    status: payload.status,
    assigned_to: payload.assignees?.[0] ?? null,
    expected_hours: payload.estimatedHours ?? 0,
    priority: payload.priority,
    category: payload.category,
    ...(payload.dueDate && {
      due_date: `${payload.dueDate}T00:00:00Z`,
    }),
  };
}

export async function deleteTaskAPI(
  project_id: string,
  task_id: string
): Promise<DeleteTaskResponseType> {
  const endpoint = `/api/projects/${project_id}/tasks/${task_id}/`;
  const res = await authFetch(endpoint, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to delete task');
  }
  const data: DeleteTaskResponseType = await res.json()
  return data;
}

export async function getTaskAttachmentsAPI(task_id: string): Promise<TaskAttachmentType[]> {
  const res = await authFetch(`/api/tasks/${task_id}/attachments/`, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch attachments');
  }

  const data: TaskAttachmentType[] = await res.json();
  return data;
}

export async function createTaskAttachmentAPI(
  task_id: string,
  payload: CreateTaskAttachmentPayloadType
): Promise<TaskAttachmentType> {
  const res = await authFetch(`/api/tasks/${task_id}/attachments/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to create attachment');
  }

  const data: TaskAttachmentType = await res.json();
  return data;
}

export async function deleteTaskAttachmentAPI(
  task_id: string,
  attachment_id: string
): Promise<DeleteTaskAttachmentResponseType> {
  const res = await authFetch(`/api/tasks/${task_id}/attachments/${attachment_id}/`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to delete attachment');
  }

  const data: DeleteTaskAttachmentResponseType = await res.json();
  return data;
}