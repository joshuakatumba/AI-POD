import {
  CreateTaskCommentPayloadType,
  DeleteTaskCommentResponseType,
  TaskCommentType,
  UpdateTaskCommentPayloadType,
} from '@/_types/task';
import { authFetch } from '@/utils/apiClient';

function getTaskCommentsEndpoint(taskId: string): string {
  return `/api/tasks/${taskId}/comments/`;
}

function getTaskCommentDetailEndpoint(taskId: string, commentId: string): string {
  return `/api/tasks/${taskId}/comments/${commentId}/`;
}

export async function getTaskCommentsAPI(taskId: string): Promise<TaskCommentType[]> {
  const endpoint = getTaskCommentsEndpoint(taskId);
  const res = await authFetch(endpoint, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to fetch task comments');
  }

  const data: TaskCommentType[] = await res.json();
  return data;
}

export async function createTaskCommentAPI(
  taskId: string,
  payload: CreateTaskCommentPayloadType,
): Promise<TaskCommentType> {
  const endpoint = getTaskCommentsEndpoint(taskId);
  const res = await authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to create task comment');
  }

  const data: TaskCommentType = await res.json();
  return data;
}

export async function getTaskCommentByIdAPI(
  taskId: string,
  commentId: string,
): Promise<TaskCommentType> {
  const endpoint = getTaskCommentDetailEndpoint(taskId, commentId);
  const res = await authFetch(endpoint, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to fetch task comment');
  }

  const data: TaskCommentType = await res.json();
  return data;
}

export async function updateTaskCommentAPI(
  taskId: string,
  commentId: string,
  payload: UpdateTaskCommentPayloadType,
): Promise<TaskCommentType> {
  const endpoint = getTaskCommentDetailEndpoint(taskId, commentId);
  const res = await authFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to update task comment');
  }

  const data: TaskCommentType = await res.json();
  return data;
}

export async function deleteTaskCommentAPI(
  taskId: string,
  commentId: string,
): Promise<DeleteTaskCommentResponseType> {
  const endpoint = getTaskCommentDetailEndpoint(taskId, commentId);
  const res = await authFetch(endpoint, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to delete task comment');
  }

  const data: DeleteTaskCommentResponseType = await res.json();
  return data;
}