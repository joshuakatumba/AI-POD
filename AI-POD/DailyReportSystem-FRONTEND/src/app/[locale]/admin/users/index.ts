import { AdminUserType, DeactivateAdminUserPayloadType, UpdateAdminUserPayloadType } from "@/_types/admin";
import { authFetch } from "@/utils/apiClient";

export async function getAdminUsersAPI(): Promise<AdminUserType[]> {
    const endpoint = `/api/sysadmin/users/`;

    const res = await authFetch(endpoint, {
        method: "GET",
    });

    if (!res.ok) {
        throw new Error(
            `Failed to fetch admin users: ${res.status} ${res.statusText}`
        );
    }

    const data: AdminUserType[] = await res.json();
    return data;
}

export async function updateAdminUserAPI(
    userId: string,
    payload: UpdateAdminUserPayloadType | DeactivateAdminUserPayloadType
): Promise<AdminUserType> {

    const endpoint = `/api/sysadmin/users/${userId}/`;

    const res = await authFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.message || "Failed to update user");
    }

    const data: AdminUserType = await res.json();
    return data;
}