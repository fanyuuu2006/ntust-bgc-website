import type { Instrumentation } from "next";
import { reportUnexpectedError } from "@/libs/observability/report";
import { isErrorId } from "@/libs/observability/reference";

export const onRequestError: Instrumentation.onRequestError = (error, _request, context) => {
  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : undefined;
  const transported = digest?.startsWith("app-error:") ? digest.slice(10) : undefined;
  if (isErrorId(transported)) return;
  // Last-resort framework failures outside the application-owned boundaries.
  reportUnexpectedError(error, { context: "server.request", route: context.routePath, nextDigest: digest });
};
