import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { membershipService } from "@/services/memberships/memberships.service";
import { MembershipAlreadyExistsForAcademicYearError, MembershipNotFoundError, MembershipStatusTransitionError } from "@/services/memberships/memberships.errors";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
type Context = { params: Promise<{ id: string }> }; async function admin() { const user = await getCurrentUser(); return Boolean(user && await isAdminByUserId(user.id)); }
export async function PATCH(request: Request, { params }: Context) { if (!await admin()) return NextResponse.json({ message: "您沒有管理社員資格的權限" }, { status: 403 }); try { return NextResponse.json({ data: await membershipService.updateForAdmin((await params).id, await request.json()) }); } catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "輸入資料格式不正確", errors: z.treeifyError(error) }, { status: 400 }); if (error instanceof MembershipNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 }); if (error instanceof MembershipAlreadyExistsForAcademicYearError || error instanceof MembershipStatusTransitionError) return NextResponse.json({ message: error.message }, { status: 409 }); return unexpectedErrorResponse("[PATCH /api/admin/memberships/[id]]", error, "更新社員資格失敗，請稍後再試"); } }

export async function DELETE(_: Request, { params }: Context) { if (!await admin()) return NextResponse.json({ message: "您沒有管理社員資格的權限" }, { status: 403 }); try { await membershipService.deleteForAdmin((await params).id); return NextResponse.json({ data: null }); } catch (error) { if (error instanceof MembershipNotFoundError) return NextResponse.json({ message: error.message }, { status: 404 }); return unexpectedErrorResponse("[DELETE /api/admin/memberships/[id]]", error, "刪除社員資格失敗，請稍後再試"); } }
