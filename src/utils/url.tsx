type QueryPrimitive = string | number | boolean | Date;
export type QueryValue =
  | QueryPrimitive
  | readonly QueryPrimitive[]
  | null
  | undefined;

export function buildQueryString<T extends Record<string, QueryValue>>(
  state: T,
  overrides: Partial<T> = {},
): string {
  const params = new URLSearchParams();

  const query = { ...state, ...overrides };

  // 過濾掉值為 null 或 undefined 的屬性，並將陣列展開為多個同名參數
  for (const [key, value] of Object.entries(query)) {
    // 過濾掉空字串，避免產生無意義的查詢參數
    if (value == null) continue;

    // 如果值是陣列，則展開為多個同名參數
    if (Array.isArray(value)) {
      // 過濾掉空陣列，避免產生無意義的查詢參數
      if (value.length === 0) continue;

      for (const item of value) {
        const normalizedItem =
          typeof item === "string" ? item.trim() : item;
        if (normalizedItem === "") continue;

        params.append(
          key,
          normalizedItem instanceof Date
            ? normalizedItem.toISOString()
            : String(normalizedItem),
        );
      }

      continue;
    }

    // 過濾掉空字串，避免產生無意義的查詢參數
    const normalizedValue = typeof value === "string" ? value.trim() : value;
    if (normalizedValue === "") continue;

    params.set(
      key,
      normalizedValue instanceof Date
        ? normalizedValue.toISOString()
        : String(normalizedValue),
    );
  }

  return params.toString();
}
