import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { academicYearsService, DuplicateAcademicYearError } from "@/services/academic-years/academic-years.service";

export async function GET() {
  try { const authorization = await authorizeAdminRequest("您沒有管理學年度的權限"); if (authorization.response) return authorization.response; return NextResponse.json({ data: await academicYearsService.list() });
  } catch (error) {
    return unexpectedErrorResponse("[GET /api/admin/academic-years]", error, "操作暫時無法完成，請稍後再試。");
  }
}
export async function POST(request: Request) {
  try { const authorization = await authorizeAdminRequest("您沒有管理學年度的權限"); if (authorization.response) return authorization.response; try { return NextResponse.json({ data: await academicYearsService.create(await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); if (error instanceof DuplicateAcademicYearError) return NextResponse.json({ message: error.message }, { status: 409 });  return unexpectedErrorResponse("[POST /api/admin/academic-years]", error, "新增學年度失敗"); }
  } catch (error) {
    return unexpectedErrorResponse("[POST /api/admin/academic-years]", error, "操作暫時無法完成，請稍後再試。");
  }
}
