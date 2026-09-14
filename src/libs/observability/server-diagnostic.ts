import { isOperationContext } from "./operation-context";

/** 只讀取自有資料屬性，不執行 getter，也不遞迴序列化 request/provider 物件。 */
function field(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

/**
 * Server 診斷只接受已知技術訊息格式。未知自由文字可能包含真實姓名、學號或
 * provider payload，不能僅靠 token 正規表示式假設安全；此時保留 code 並省略文字。
 */
function diagnosticText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!/^(?:Could not find |column |relation |permission denied |duplicate key value violates |null value in column |violates |JWT |TypeError: fetch failed|fetch failed|connect |getaddrinfo |network |request timeout|canceling statement|Reload the schema cache|Perhaps you meant |Searched for |No rows |The result contains )/i.test(value)) return undefined;
  return value.slice(0, 1600)
    .split(/[\r\n]/, 1)[0]
    .replace(/(?:[\w-]*(?:cookie|authorization|password|passwd|secret|token|api[_-]?key)[\w-]*|request\s*body)["']?\s*[=:].*/gi, "[REDACTED]")
    .replace(/(?:https?|postgres(?:ql)?):\/\/\S+/gi, "[URL REDACTED]")
    .replace(/Bearer\s+\S+|eyJ[\w-]+\.[\w-]+\.[\w-]+|(?:sb_secret_|xkeysib-|sk-)[\w-]+/g, "[REDACTED]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[EMAIL REDACTED]")
    .replace(/\([^)]*\)/g, "[VALUES REDACTED]")
    .replace(/\b\d{5,}\b/g, "[NUMBER REDACTED]")
    .replace(/(['"])(.*?)\1/g, (_match, _quote, text: string) => /^[a-z_][a-z0-9_.]*$/.test(text) ? `"${text}"` : "[VALUE REDACTED]");
}

/** 僅供 Server reporter 輸出；不作為 API、digest 或 production UI 的資料來源。 */
export function serverDiagnostic(error: unknown, depth = 0): object {
  if (depth > 3 || !error || typeof error !== "object") return { type: "UnknownError" };
  const name = field(error, "name");
  const rawCode = field(error, "code");
  const code = typeof rawCode === "string" && /^(?:[0-9A-Z]{5}|PGRST\d{3}|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND)$/.test(rawCode) ? rawCode : undefined;
  const postgrest = !!code && /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(code) && typeof field(error, "message") === "string" && name !== "RepositoryError";
  const type = postgrest ? "PostgrestError" : typeof name === "string" && ["RepositoryError", "Error", "TypeError", "AbortError", "TimeoutError", "TransactionalEmailDeliveryError"].includes(name) ? name : "UnknownError";
  const status = field(error, "status");
  const rawMessage = field(error, "message");
  const fetchFailure = typeof rawMessage === "string" && /^(?:TypeError: )?fetch failed(?:\s|$)/i.test(rawMessage);
  const operation = field(error, "context");
  const operationContext = field(error, "operationContext");
  const cause = field(error, "cause");
  const textFields = postgrest || type === "TypeError" ? Object.fromEntries(["message", "details", "hint"].flatMap<[string, string | null]>(key => {
    const value = field(error, key);
    if (value === null) return [[key, null]];
    const cleaned = diagnosticText(value);
    return cleaned ? [[key, cleaned]] : [];
  })) : {};
  return {
    type: fetchFailure ? "FetchError" : type, ...(code ? { code } : {}),
    ...(typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599 ? { status } : {}),
    ...(type === "RepositoryError" && typeof operation === "string" && /^[\p{Script=Han}A-Za-z ._-]{1,120}$/u.test(operation) ? { operation } : {}),
    ...(type === "RepositoryError" && isOperationContext(operationContext) ? { operationContext } : {}),
    ...textFields,
    ...(fetchFailure ? { message: "fetch failed" } : {}),
    ...(cause && cause !== error ? { cause: serverDiagnostic(cause, depth + 1) } : {}),
  };
}
