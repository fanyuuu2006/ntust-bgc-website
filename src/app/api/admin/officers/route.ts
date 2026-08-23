import { NextResponse } from "next/server";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
async function admin() { const user = await getCurrentUser(); return Boolean(user && await isAdminByUserId(user.id)); }
export async function GET(request: Request) { if (!await admin()) return NextResponse.json({ message: "您沒有管理幹部職位的權限" }, { status: 403 }); const { searchParams } = new URL(request.url); return NextResponse.json({ data: await officerPositionsService.listForAdmin({ page: Number(searchParams.get("page")) || 1, pageSize: Number(searchParams.get("pageSize")) || 20, academicYearId: searchParams.get("academic_year_id") || undefined }) }); }
export async function POST(request: Request) { if (!await admin()) return NextResponse.json({ message: "您沒有管理幹部職位的權限" }, { status: 403 }); try { return NextResponse.json({ data: await officerPositionsService.createForAdmin(await request.json()) }, { status: 201 }); } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : "新增幹部職位失敗" }, { status: 400 }); } }
