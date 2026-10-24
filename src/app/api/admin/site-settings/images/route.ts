import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { siteSettingsImageService } from "@/services/site-settings/site-settings-image.service";

export async function POST(request: Request) {
  try {
    const authorization = await authorizeAdminRequest("需要管理員權限");
    if (authorization.response) return authorization.response;
    const formData = await request.formData();
    const field = formData.get("field");
    const file = formData.get("file");
    if (typeof field !== "string" || !(file instanceof File)) return NextResponse.json({ message: "請選擇圖片檔案" }, { status: 400 });
    try {
      return NextResponse.json({ data: await siteSettingsImageService.upload(field, file) }, { status: 201 });
    } catch (error) {
      return unexpectedErrorResponse("[POST /api/admin/site-settings/images]", error, "圖片上傳失敗，請稍後再試");
    }
  } catch (error) {
    return unexpectedErrorResponse("[POST /api/admin/site-settings/images]", error, "圖片上傳失敗，請稍後再試");
  }
}
