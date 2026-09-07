import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { academicYearsService, DuplicateAcademicYearError } from "@/services/academic-years/academic-years.service";

export async function GET() { const authorization = await authorizeAdminRequest("您沒有管理學年度的權限"); if (authorization.response) return authorization.response; return NextResponse.json({ data: await academicYearsService.list() }); }
export async function POST(request: Request) { const authorization = await authorizeAdminRequest("您沒有管理學年度的權限"); if (authorization.response) return authorization.response; try { return NextResponse.json({ data: await academicYearsService.create(await request.json()) }, { status: 201 }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); if (error instanceof DuplicateAcademicYearError) return NextResponse.json({ message: error.message }, { status: 409 }); console.error("[POST /api/admin/academic-years]", error); return NextResponse.json({ message: "新增學年度失敗" }, { status: 500 }); } }
