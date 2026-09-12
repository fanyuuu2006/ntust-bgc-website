import { ApiError, type ApiErrorResponse } from "./errors";
import { reportUnexpectedError } from "@/libs/observability/report";
import { errorMessageWithReference, isErrorId, UNEXPECTED_ERROR_MESSAGE } from "@/libs/observability/reference";

type ApiRequestOptions = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiClient<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: { "Content-Type": "application/json", ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const errorId = reportUnexpectedError(error, { context: "client.request", route: url, method: options.method ?? "GET" });
    throw new ApiError(errorMessageWithReference(UNEXPECTED_ERROR_MESSAGE, errorId), 0, undefined, errorId);
  }
  let data: unknown = null;
  try { data = await response.json(); } catch { /* Empty or non-JSON response. */ }
  if (!response.ok) {
    const errorData = data && typeof data === "object" ? data as ApiErrorResponse : null;
    if (response.status >= 500) {
      // A server-owned ID is displayed unchanged, never reported as a second incident.
      const errorId = isErrorId(errorData?.errorId) ? errorData.errorId : reportUnexpectedError(new Error(), { context: "client.request", route: url, method: options.method ?? "GET" });
      throw new ApiError(errorMessageWithReference(UNEXPECTED_ERROR_MESSAGE, errorId), response.status, undefined, errorId);
    }
    throw new ApiError(typeof errorData?.message === "string" ? errorData.message : "API 請求失敗", response.status, errorData?.errors);
  }
  return data as T;
}
