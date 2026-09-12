import { NextResponse } from "next/server"; import { ZodError, z } from "zod"; import { authorizeAdminRequest } from "@/libs/api/admin-authorization"; import { unexpectedErrorResponse } from "@/libs/api/server-response"; import { announcementsService } from "@/services/announcements/announcements.service";
export async function POST(request: Request) {
  try { const authorization = await authorizeAdminRequest("沒有管理權限"); if (authorization.response) return authorization.response; try { return NextResponse.json({ data: await announcementsService.createForAdmin(authorization.user.id, await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); return unexpectedErrorResponse("[POST /api/admin/announcements]", error, "建立公告失敗，請稍後再試"); }
  } catch (error) {
    return unexpectedErrorResponse("[POST /api/admin/announcements]", error, "操作暫時無法完成，請稍後再試。");
  }
}
