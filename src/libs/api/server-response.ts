import { NextResponse } from "next/server";

export function unexpectedErrorResponse(
  context: string,
  error: unknown,
  message: string,
) {
  console.error(context, error);
  return NextResponse.json({ message }, { status: 500 });
}
