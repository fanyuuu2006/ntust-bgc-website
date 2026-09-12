import { NextResponse } from "next/server";
import { reportUnexpectedError } from "@/libs/observability/report";

export function unexpectedErrorResponse(
  context: string,
  error: unknown,
  message: string,
  status: 500 | 503 = 500,
) {
  const errorId = reportUnexpectedError(error, { context });
  return NextResponse.json({ message, errorId }, { status });
}
