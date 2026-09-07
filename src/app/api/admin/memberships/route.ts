import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { membershipService } from "@/services/memberships/memberships.service";
import { AcademicYearNotFoundError, MembershipAlreadyExistsForAcademicYearError, MembershipUserNotFoundError } from "@/services/memberships/memberships.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
export async function POST(request: Request) { const authorization = await authorizeAdminRequest("您沒有管理社員資格的權限"); if (authorization.response) return authorization.response; try { return NextResponse.json({ data: await membershipService.createForAdmin(await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); if (error instanceof MembershipUserNotFoundError || error instanceof AcademicYearNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 }); if (error instanceof MembershipAlreadyExistsForAcademicYearError) return NextResponse.json({ message: error.message }, { status: 409 }); return unexpectedErrorResponse("[POST /api/admin/memberships]", error, "新增社員資格失敗，請稍後再試"); } }
