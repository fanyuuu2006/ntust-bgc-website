/**
 * 建立多欄位的 ilike OR 查詢字串，並跳脫 % 與 _ 這兩個
 * Postgres LIKE / ILIKE 的萬用字元，避免使用者輸入干擾查詢。
 *
 * 例如 buildIlikeSearch(["name", "email"], "50%off")
 * → "name.ilike.%50\%off%,email.ilike.%50\%off%"
 */
export function buildIlikeSearch(fields: string[], keyword: string): string {
  const escaped = keyword.replace(/[%_]/g, (c) => `\\${c}`);
  return fields.map((field) => `${field}.ilike.%${escaped}%`).join(",");
}

export function buildNumericSearch(fields: string[], keyword: string): string {
  if (!/^\d+$/.test(keyword)) {
    return "";
  }

  return fields.map((field) => `${field}.eq.${keyword}`).join(",");
}
