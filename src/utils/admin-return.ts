import { getSafeReturnPath } from "@/utils/redirect";
import { buildQueryString, type QueryValue } from "@/utils/url";

export type AdminListPath =
  | "/admin/board-games"
  | "/admin/announcements"
  | "/admin/events"
  | "/admin/users";

/** Only the exact owning list is a valid destination, never another workflow. */
export function getAdminReturnPath(value: unknown, listPath: AdminListPath): string {
  if (typeof value !== "string") return listPath;
  const safe = getSafeReturnPath(value, listPath);
  if (/[\\\u0000-\u0020\u007f]/.test(safe)) return listPath;
  const path = safe.split(/[?#]/, 1)[0];
  if (path !== listPath || safe.includes("#")) return listPath;
  return safe;
}

export function buildAdminListHref(listPath: AdminListPath, query: Record<string, QueryValue>): string {
  const search = buildQueryString(query);
  return search ? `${listPath}?${search}` : listPath;
}

export function buildAdminReturnHref(workflowPath: string, returnTo: string, listPath: AdminListPath): string {
  return `${workflowPath}?${new URLSearchParams({ returnTo: getAdminReturnPath(returnTo, listPath) })}`;
}
