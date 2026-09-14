import { NextResponse } from "next/server";
import { reportUnexpectedError } from "@/libs/observability/report";
import { isAuthInfrastructureUnavailable } from "@/libs/supabase/auth-unavailable";

export function unexpectedErrorResponse(
  context: string,
  error: unknown,
  message: string,
  status: 500 | 503 = 500,
) {
  const errorId = reportUnexpectedError(error, { context });
  if (isAuthInfrastructureUnavailable(error)) {
    return NextResponse.json({ message: "服務目前暫時無法使用，請稍後再試。", errorId }, { status: 503 });
  }
  return NextResponse.json({ message, errorId }, { status });
}
