import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { AcademicYearCurrentDeleteForbiddenError, AcademicYearInUseError, AcademicYearNotFoundError, academicYearsService, DuplicateAcademicYearError } from "@/services/academic-years/academic-years.service";
type Context = { params: Promise<{ id: string }> };
function errorResponse(error: unknown, method: "PATCH" | "DELETE") { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); if (error instanceof AcademicYearNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 }); if (error instanceof DuplicateAcademicYearError || error instanceof AcademicYearInUseError || error instanceof AcademicYearCurrentDeleteForbiddenError) return NextResponse.json({ message: error.message }, { status: 409 }); return unexpectedErrorResponse(`[${method} /api/admin/academic-years/[id]]`, error, "學年度操作失敗"); }
export async function PATCH(request: Request, { params }: Context) {
  try { const authorization = await authorizeAdminRequest("您沒有管理學年度的權限"); if (authorization.response) return authorization.response; try { const { id } = await params; const body = await request.json(); const data = body.action === "set-current" ? await academicYearsService.setCurrent(id) : await academicYearsService.update(id, body); return NextResponse.json({ data }); } catch (error) {  return errorResponse(error, "PATCH"); }
  } catch (error) {
    return unexpectedErrorResponse("[PATCH /api/admin/academic-years/[id]]", error, "操作暫時無法完成，請稍後再試。");
  }
}
export async function DELETE(_: Request, { params }: Context) {
  try { const authorization = await authorizeAdminRequest("您沒有管理學年度的權限"); if (authorization.response) return authorization.response; try { await academicYearsService.delete((await params).id); return NextResponse.json({ data: null }); } catch (error) { return errorResponse(error, "DELETE"); }
  } catch (error) {
    return unexpectedErrorResponse("[DELETE /api/admin/academic-years/[id]]", error, "操作暫時無法完成，請稍後再試。");
  }
}
