
const PREFIX = "[DevelopmentDiagnostics]";
type Diagnostic = { name: string; message: string; code?: string; context?: string; stack?: string; cause?: string };

function field(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object") return undefined;
  // Read data properties only; never invoke getters or serialize arbitrary objects.
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor && "value" in descriptor) return descriptor.value;
  // V8 exposes Error.stack through a native accessor, including assigned stacks.
  if (key === "stack" && value instanceof Error && descriptor?.get &&
      Function.prototype.toString.call(descriptor.get).includes("[native code]")) return descriptor.get.call(value);
  return undefined;
}
function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, 12000)
    .replace(/(?:cookie|authorization|request[ -]?body)["']?\s*[:=][^\r\n]*/gi, "[REDACTED]")
    .replace(/(?:[\w-]*(?:password|passwd|secret|token|api[_-]?key|service[_-]?role[_-]?key)[\w-]*)["']?\s*[=:]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi, "[REDACTED]")
    .replace(/Bearer\s+[^\s]+/gi, "[REDACTED]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED]")
    .replace(/\b(?:sk-[A-Za-z0-9_-]+|xkeysib-[A-Za-z0-9_-]+)\b/g, "[REDACTED]")
    .replace(/https?:\/\/[^\s]+/gi, "[URL REDACTED]");
}
function select(value: unknown): Diagnostic {
  return {
    name: clean(field(value, "name")) ?? "Error",
    message: clean(field(value, "message")) ?? "沒有可用的錯誤訊息",
    code: clean(field(value, "code")), context: clean(field(value, "context")),
    stack: clean(field(value, "stack")), cause: clean(field(value, "cause")),
  };
}
export function getDevelopmentDiagnostics(error: unknown): Diagnostic | null {
  if (process.env.NODE_ENV === "production") return null;
  const message = field(error, "message");
  if (typeof message === "string" && message.startsWith(PREFIX)) {
    try { return select(JSON.parse(message.slice(PREFIX.length))); } catch { /* Ordinary error fallback. */ }
  }
  const info = select(error);
  if (error instanceof Error && info.name === "Error") info.name = clean(error.constructor.name) ?? "Error";
  const cause = field(error, "cause");
  if (cause && typeof cause === "object") {
    const summary = select(cause);
    info.cause = [summary.name, summary.message, summary.code].filter(Boolean).join(": ");
  }
  return info;
}
export function developmentErrorMessage(error: unknown): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  // Next transports message, not arbitrary Error fields. Serialize only our selected contract.
  return PREFIX + JSON.stringify(getDevelopmentDiagnostics(error));
}
