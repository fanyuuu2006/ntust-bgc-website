import "server-only";
import { developmentErrorMessage } from "./development-diagnostics";
import { unstable_rethrow } from "next/navigation";
import { reportUnexpectedError } from "./report";
import { isErrorId, UNEXPECTED_ERROR_MESSAGE } from "./reference";

export function throwReportedRenderError(error: unknown, route: string): never {
  // Redirect, notFound and dynamic-render control signals must retain Next's semantics.
  unstable_rethrow(error);
  const digest = error instanceof Error && "digest" in error ? error.digest : undefined;
  if (typeof digest === "string" && digest.startsWith("app-error:") && isErrorId(digest.slice(10))) throw error;
  const errorId = reportUnexpectedError(error, { context: "render", route });
  // Set the documented digest transport before Next serializes the server exception.
  // No original message/cause is attached: Next's own logs must not print secret material.
  const message = process.env.NODE_ENV !== "production"
    ? developmentErrorMessage(error) ?? UNEXPECTED_ERROR_MESSAGE
    : UNEXPECTED_ERROR_MESSAGE;
  throw Object.assign(new Error(message), { digest: "app-error:" + errorId });
}

export function withServerErrorReference<Args extends unknown[], Result>(operation: (...args: Args) => Result, route: string) {
  return async (...args: Args): Promise<Awaited<Result>> => {
    try { return await operation(...args); }
    catch (error) { throwReportedRenderError(error, route); }
  };
}
