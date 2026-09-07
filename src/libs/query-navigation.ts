type QueryPrimitive = string | number | boolean | Date;

export type AppliedQueryValue =
  | QueryPrimitive
  | readonly QueryPrimitive[]
  | null
  | undefined;

export type AppliedQuery =
  | Record<string, AppliedQueryValue>
  | Pick<URLSearchParams, "entries">;

type BuildOwnedQueryHrefOptions = {
  basePath: string;
  appliedQuery: AppliedQuery;
  ownedKeys: readonly string[];
  changes: Record<string, AppliedQueryValue>;
};

function serializeValue(value: QueryPrimitive): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : value;

  if (normalized === "") return undefined;
  return normalized instanceof Date
    ? normalized.toISOString()
    : String(normalized);
}

function appendValue(
  params: URLSearchParams,
  key: string,
  value: AppliedQueryValue,
) {
  if (value == null) return;

  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    const serialized = serializeValue(item);
    if (serialized !== undefined) params.append(key, serialized);
  }
}

function toSearchParams(query: AppliedQuery): URLSearchParams {
  if (typeof query.entries === "function") {
    return new URLSearchParams(Array.from(query.entries()));
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    appendValue(params, key, value);
  }
  return params;
}

export function getPreservedQueryEntries(
  appliedQuery: AppliedQuery,
  ownedKeys: readonly string[],
): Array<[string, string]> {
  const excluded = new Set(["page", ...ownedKeys]);

  return Array.from(toSearchParams(appliedQuery).entries()).filter(
    ([key]) => !excluded.has(key),
  );
}

export function getOwnedQueryStateKey(
  appliedQuery: AppliedQuery,
  ownedKeys: readonly string[],
): string {
  const owned = new Set(ownedKeys);

  return Array.from(toSearchParams(appliedQuery).entries())
    .filter(([key]) => owned.has(key))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export function buildOwnedQueryHref({
  basePath,
  appliedQuery,
  ownedKeys,
  changes,
}: BuildOwnedQueryHrefOptions): string {
  const params = toSearchParams(appliedQuery);

  for (const key of ownedKeys) params.delete(key);
  params.set("page", "1");

  for (const [key, value] of Object.entries(changes)) {
    params.delete(key);
    appendValue(params, key, value);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
