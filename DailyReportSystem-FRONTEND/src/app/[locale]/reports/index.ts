import { GetReportsParams, ReportResponseType } from "@/_types/reports";
import { authFetch } from "@/utils/apiClient";

export async function getReportsAPI(
  params?: GetReportsParams & { project?: string }
): Promise<ReportResponseType[]> {
  const searchParams = new URLSearchParams();

  if (params?.project) {
    searchParams.set("project", params.project);
  }

  if (params?.membership) {
    searchParams.set("membership", params.membership);
  }

  if (params?.membership_user_id) {
    searchParams.set("membership_user_id", params.membership_user_id);
  }

  if (params?.month) {
    searchParams.set("month", params.month);
  }

  if (params?.page) {
    searchParams.set("page", String(params.page));
  }

  if (params?.page_size) {
    searchParams.set("page_size", String(params.page_size));
  }

  const res = await authFetch(
    `/api/reports/?${searchParams.toString()}`,
    {
      method: "GET",
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || "Failed to fetch reports");
  }

  const data = await res.json();

  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;

  return [];
}

export async function getReportDetailsAPI(
  reportId: string
): Promise<ReportResponseType> {
  const res = await authFetch(`/api/reports/${reportId}/`, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch report');
  }

  const data: ReportResponseType = await res.json();
  return data;
}

export async function invalidateReportAPI(reportId: string): Promise<ReportResponseType> {
  const res = await authFetch(`/api/reports/${reportId}/invalidate/`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to invalidate report');
  }
  const data: ReportResponseType = await res.json();
  return data;
}