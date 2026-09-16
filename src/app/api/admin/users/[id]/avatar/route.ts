import { NextResponse } from "next/server";
import { z } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import {
  AvatarImageInputError,
  AvatarMutationConflictError,
} from "@/services/avatars/avatars.errors";
import { avatarsService } from "@/services/avatars/avatars.service";

const targetUserIdSchema = z.uuid();

function invalidTargetResponse() {
  return NextResponse.json({ message: "使用者編號格式不正確" }, { status: 400 });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeAdminRequest("您沒有管理使用者頭像的權限");
    if (authorization.response) return authorization.response;
    const parsedTarget = targetUserIdSchema.safeParse((await params).id);
    if (!parsedTarget.success) return invalidTargetResponse();

    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;")) {
      return NextResponse.json({ message: "請使用 multipart/form-data 上傳圖片檔案" }, { status: 400 });
    }
    let formData: FormData;
    try { formData = await request.formData(); }
    catch { return NextResponse.json({ message: "無法讀取上傳資料" }, { status: 400 }); }
    const entries = [...formData.entries()];
    const files = entries.filter((entry): entry is [string, File] => typeof entry[1] !== "string");
    if (entries.length !== 1 || files.length !== 1 || files[0][0] !== "file") {
      return NextResponse.json({ message: "請只提供一個 file 圖片欄位" }, { status: 400 });
    }

    const data = await avatarsService.replace(parsedTarget.data, files[0][1]);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof AvatarImageInputError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof AvatarMutationConflictError) return NextResponse.json({ message: error.message }, { status: 409 });
    return unexpectedErrorResponse("[POST /api/admin/users/[id]/avatar]", error, "上傳使用者頭像失敗，請稍後再試");
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authorization = await authorizeAdminRequest("您沒有管理使用者頭像的權限");
    if (authorization.response) return authorization.response;
    const parsedTarget = targetUserIdSchema.safeParse((await params).id);
    if (!parsedTarget.success) return invalidTargetResponse();
    const data = await avatarsService.remove(parsedTarget.data);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof AvatarMutationConflictError) return NextResponse.json({ message: error.message }, { status: 409 });
    return unexpectedErrorResponse("[DELETE /api/admin/users/[id]/avatar]", error, "移除使用者頭像失敗，請稍後再試");
  }
}
