import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { siteSettingsService } from "@/services/site-settings/site-settings.service";
import { invalidatePublicDataSafely } from "@/libs/cache/public-data";

const FORBIDDEN_MESSAGE = "需要管理員權限";

export async function GET() {
  try {
    const authorization = await authorizeAdminRequest(FORBIDDEN_MESSAGE);
    if (authorization.response) return authorization.response;
    return NextResponse.json({ data: await siteSettingsService.getPublic() });
  } catch (error) {
    return unexpectedErrorResponse("[GET /api/admin/site-settings]", error, "讀取網站設定失敗，請稍後再試");
  }
}

export async function PATCH(request: Request) {
  try {
    const authorization = await authorizeAdminRequest(FORBIDDEN_MESSAGE);
    if (authorization.response) return authorization.response;

    try {
      const data = await siteSettingsService.update(await request.json(), authorization.user.id);
      invalidatePublicDataSafely("siteSettings");
      return NextResponse.json({ data });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { message: "輸入資料格式不正確", errors: z.treeifyError(error) },
          { status: 400 },
        );
      }
      return unexpectedErrorResponse("[PATCH /api/admin/site-settings]", error, "更新網站設定失敗，請稍後再試");
    }
  } catch (error) {
    return unexpectedErrorResponse("[PATCH /api/admin/site-settings]", error, "更新網站設定失敗，請稍後再試");
  }
}
