export type QueryParamValue = string | string[] | undefined;

export function readSingleQueryValue(
  value: QueryParamValue,
): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string") return undefined;

  const normalized = first.trim();
  return normalized === "" ? undefined : normalized;
}

export function readQueryValues(value: QueryParamValue): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return values.map((item) => item.trim()).filter(Boolean);
}

export function queryRecordFromSearchParams(
  searchParams: URLSearchParams,
): Record<string, QueryParamValue> {
  return Object.fromEntries(
    [...new Set(searchParams.keys())].map((key) => {
      const values = searchParams.getAll(key);
      return [key, values.length > 1 ? values : values[0]];
    }),
  );
}

export function normalizePageSizeOption<const T extends readonly number[]>(
  value: QueryParamValue,
  options: T,
  fallback: T[number],
): T[number] {
  const parsed = Number(readSingleQueryValue(value));
  return options.includes(parsed as T[number]) ? (parsed as T[number]) : fallback;
}
