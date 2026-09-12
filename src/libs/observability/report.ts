import { isErrorId } from "./reference";

type ErrorContext = {
  context: string;
  errorId?: string;
  route?: string;
  method?: string;
  nextDigest?: string;
};

// Weak keys only deduplicate a live exception; this is not an incident store.
const references = new WeakMap<object, string>();
const knownNames = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "AbortError",
  "TimeoutError",
  "RepositoryError",
  "TransactionalEmailDeliveryError",
]);
const routeSegments = new Set([
  "api",
  "admin",
  "auth",
  "users",
  "me",
  "profile",
  "account",
  "board-games",
  "board-game-categories",
  "board-game-locations",
  "borrowings",
  "borrow",
  "cancel",
  "events",
  "check-in",
  "attendance",
  "announcements",
  "academic-years",
  "members",
  "memberships",
  "activate",
  "register-keys",
  "officers",
  "search",
  "login",
  "logout",
  "register",
  "password",
  "sessions",
  "email-verification",
  "confirm",
  "resend",
  "verify-email",
  "dashboard",
  "settings",
  "new",
  "edit",
]);

export function safeRouteCategory(route: string): string {
  return (
    "/" +
    route
      .split(/[?#]/, 1)[0]
      .split("/")
      .filter(Boolean)
      .slice(0, 10)
      .map((part) => (routeSegments.has(part) ? part : "[id]"))
      .join("/")
  );
}

function technicalCause(error: unknown, depth = 0): object {
  if (depth > 2 || !error || typeof error !== "object")
    return { type: "UnknownError" };
  // Never serialize messages, stacks, SQL details, request bodies or provider responses.
  const value = error as { name?: unknown; code?: unknown; cause?: unknown };
  const type =
    typeof value.name === "string" && knownNames.has(value.name)
      ? value.name
      : "UnknownError";
  const code =
    typeof value.code === "string" &&
    /^(?:[0-9]{5}|PGRST\d{3}|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND)$/.test(
      value.code,
    )
      ? value.code
      : undefined;
  return {
    type,
    ...(code ? { code } : {}),
    ...(value.cause && value.cause !== error
      ? { cause: technicalCause(value.cause, depth + 1) }
      : {}),
  };
}

/** One provider-neutral boundary. Call with code-owned context, never request data. */
export function reportUnexpectedError(
  error: unknown,
  options: ErrorContext,
): string {
  const object =
    error !== null && typeof error === "object" ? error : undefined;
  const existing = object && references.get(object);
  if (existing) return existing;
  const errorId = isErrorId(options.errorId)
    ? options.errorId
    : crypto.randomUUID();
  if (object) references.set(object, errorId);
  const routeMatch = /^\[(GET|POST|PATCH|DELETE|PUT) (\/[^\s]+)\]$/.exec(
    options.context,
  );
  const context = routeMatch
    ? "api"
    : [
          "api",
          "client.request",
          "render",
          "server.request",
          "auth.session-touch",
          "email.initial-delivery",
          "public.viewer",
          "home.announcements",
          "home.board-games",
        ].includes(options.context)
      ? options.context
      : "unexpected";
  const route = options.route ?? routeMatch?.[2];
  const method = options.method ?? routeMatch?.[1];
  console.error(
    "[UnexpectedError]",
    JSON.stringify({
      errorId,
      context,
      ...(route ? { route: safeRouteCategory(route) } : {}),
      ...(/^(GET|POST|PATCH|DELETE|PUT|HEAD|OPTIONS)$/.test(method ?? "")
        ? { method }
        : {}),
      ...(options.nextDigest && /^\d{1,20}$/.test(options.nextDigest)
        ? { nextDigest: options.nextDigest }
        : {}),
      cause: technicalCause(error),
    }),
  );
  return errorId;
}
