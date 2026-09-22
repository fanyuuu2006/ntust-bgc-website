import "server-only";

import { NextRequest, NextResponse } from "next/server";

export function rejectUnsafeSupportMutation(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ message: "無法確認請求來源" }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ message: "請使用 JSON 格式" }, { status: 415 });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4096) {
    return NextResponse.json({ message: "請求內容過大" }, { status: 413 });
  }
  return null;
}
