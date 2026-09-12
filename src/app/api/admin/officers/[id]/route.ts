import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { OfficerInputError, OfficerPositionNotFoundError } from "@/services/officer-positions/officer-positions.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  try { const authorization = await authorizeAdminRequest("您沒有管理幹部職位的權限"); if (authorization.response) return authorization.response; try { return NextResponse.json({ data: await officerPositionsService.updateForAdmin((await params).id, await request.json()) }); } catch (error) { if (error instanceof OfficerInputError) return NextResponse.json({ message: error.message }, { status: 400 }); if (error instanceof OfficerPositionNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 }); return unexpectedErrorResponse("[PATCH /api/admin/officers/[id]]", error, "更新幹部職位失敗，請稍後再試"); }
  } catch (error) {
    return unexpectedErrorResponse("[PATCH /api/admin/officers/[id]]", error, "操作暫時無法完成，請稍後再試。");
  }
}
export async function DELETE(_: Request, { params }: Context) {
  try { const authorization = await authorizeAdminRequest("您沒有管理幹部職位的權限"); if (authorization.response) return authorization.response; try { await officerPositionsService.deleteForAdmin((await params).id); return NextResponse.json({ data: null }); } catch (error) { if (error instanceof OfficerPositionNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 }); return unexpectedErrorResponse("[DELETE /api/admin/officers/[id]]", error, "移除幹部職位失敗，請稍後再試"); }
  } catch (error) {
    return unexpectedErrorResponse("[DELETE /api/admin/officers/[id]]", error, "操作暫時無法完成，請稍後再試。");
  }
}
