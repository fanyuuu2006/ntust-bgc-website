import { NextResponse } from "next/server";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { MembershipRegisterKeyCannotBeRevokedError } from "@/services/memberships/memberships.errors";
import { membershipService } from "@/services/memberships/memberships.service";
export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 }); if (!await isAdminByUserId(user.id)) return NextResponse.json({ message: "您沒有管理社員註冊碼的權限" }, { status: 403 }); try { return NextResponse.json({ data: await membershipService.revokeRegisterKey((await params).id) }); } catch (error) { if (error instanceof MembershipRegisterKeyCannotBeRevokedError) return NextResponse.json({ message: error.message }, { status: 409 }); return NextResponse.json({ message: "撤銷社員註冊碼失敗" }, { status: 500 }); } }
