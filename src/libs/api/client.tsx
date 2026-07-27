import { ApiError, ApiErrorResponse } from "./errors";

export async function apiClient<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const { body, headers, ...rest } = options;
  const response = await fetch(url, {
    ...rest,

    headers: {
      "Content-Type": "application/json",
      ...headers,
    },

    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    // 沒有 JSON response，例如 204 No Content
  }

  if (!response.ok) {
    const errorData = data as ApiErrorResponse | null;

    throw new ApiError(
      errorData?.message ?? "API 請求失敗",
      response.status,
      errorData?.errors,
    );
  }

  return data as T;
}
