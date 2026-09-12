import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { OfficerAcademicYearNotFoundError, OfficerInputError, OfficerUserNotFoundError } from "@/services/officer-positions/officer-positions.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
export async function GET(request: Request) {
  try { const authorization = await authorizeAdminRequest("您沒有管理幹部職位的權限"); if (authorization.response) return authorization.response; const { searchParams } = new URL(request.url); return NextResponse.json({ data: await officerPositionsService.listForAdmin({ page: Number(searchParams.get("page")) || 1, pageSize: Number(searchParams.get("pageSize")) || 20, academicYearId: searchParams.get("academic_year_id") || undefined }) });
  } catch (error) {
    return unexpectedErrorResponse("[GET /api/admin/officers]", error, "操作暫時無法完成，請稍後再試。");
  }
}
export async function POST(request: Request) {
  try { const authorization = await authorizeAdminRequest("您沒有管理幹部職位的權限"); if (authorization.response) return authorization.response; try { return NextResponse.json({ data: await officerPositionsService.createForAdmin(await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof OfficerInputError) return NextResponse.json({ message: error.message }, { status: 400 }); if (error instanceof OfficerUserNotFoundError || error instanceof OfficerAcademicYearNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 }); return unexpectedErrorResponse("[POST /api/admin/officers]", error, "新增幹部職位失敗，請稍後再試"); }
  } catch (error) {
    return unexpectedErrorResponse("[POST /api/admin/officers]", error, "操作暫時無法完成，請稍後再試。");
  }
}
