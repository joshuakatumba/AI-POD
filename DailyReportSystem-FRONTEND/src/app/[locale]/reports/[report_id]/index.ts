import {
  CreateReportCommentPayloadType,
  DeleteReportCommentResponseType,
  ReportCommentType,
  UpdateReportCommentPayloadType,
} from '@/_types/reports';
import { authFetch } from '@/utils/apiClient';

export async function getReportCommentsAPI(reportId: string): Promise<ReportCommentType[]> {
  const endpoint = `/api/reports/${reportId}/comments/`;
  const res = await authFetch(endpoint, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to fetch report comments');
  }

  const data: ReportCommentType[] = await res.json();
  return data;
}

export async function createReportCommentAPI(
  reportId: string,
  payload: CreateReportCommentPayloadType,
): Promise<ReportCommentType> {
  const endpoint = `/api/reports/${reportId}/comments/`;
  const res = await authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to create report comment');
  }

  const data: ReportCommentType = await res.json();
  return data;
}

export async function getReportCommentByIdAPI(
  reportId: string,
  commentId: string,
): Promise<ReportCommentType> {
  const endpoint = `/api/reports/${reportId}/comments/${commentId}/`;
  const res = await authFetch(endpoint, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to fetch report comment');
  }

  const data: ReportCommentType = await res.json();
  return data;
}

export async function updateReportCommentAPI(
  reportId: string,
  commentId: string,
  payload: UpdateReportCommentPayloadType,
): Promise<ReportCommentType> {
  const endpoint = `/api/reports/${reportId}/comments/${commentId}/`;
  const res = await authFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to update report comment');
  }

  const data: ReportCommentType = await res.json();
  return data;
}

export async function deleteReportCommentAPI(
  reportId: string,
  commentId: string,
): Promise<DeleteReportCommentResponseType> {
  const endpoint = `/api/reports/${reportId}/comments/${commentId}/`;
  const res = await authFetch(endpoint, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(errorData || 'Failed to delete report comment');
  }

  const data: DeleteReportCommentResponseType = await res.json();
  return data;
}
