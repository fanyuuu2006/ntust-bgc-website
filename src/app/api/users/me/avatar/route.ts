import { NextResponse } from "next/server";

import { authorizeVerifiedRequest } from "@/libs/api/verified-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import {
  AvatarImageInputError,
  AvatarMutationConflictError,
} from "@/services/avatars/avatars.errors";
import { avatarsService } from "@/services/avatars/avatars.service";

export async function POST(request: Request) {
  try {
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
      return NextResponse.json(
        { message: "請使用 multipart/form-data 上傳單一圖片檔案" },
        { status: 400 },
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { message: "請使用 multipart/form-data 上傳一張頭像" },
        { status: 400 },
      );
    }
    const entries = [...formData.entries()];
    const files = entries.filter((entry): entry is [string, File] =>
      typeof entry[1] !== "string"
    );
    if (entries.length !== 1 || files.length !== 1 || files[0][0] !== "file") {
      return NextResponse.json(
        { message: "請提供一個名為 file 的圖片檔案" },
        { status: 400 },
      );
    }
    const data = await avatarsService.replace(authorization.user.id, files[0][1]);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof AvatarImageInputError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    if (error instanceof AvatarMutationConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return unexpectedErrorResponse(
      "[POST /api/users/me/avatar]",
      error,
      "頭像上傳失敗，請稍後再試",
    );
  }
}

export async function DELETE() {
  try {
    const authorization = await authorizeVerifiedRequest();
    if (authorization.response) return authorization.response;
    const data = await avatarsService.remove(authorization.user.id);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof AvatarMutationConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    return unexpectedErrorResponse(
      "[DELETE /api/users/me/avatar]",
      error,
      "移除頭像失敗，請稍後再試",
    );
  }
}
