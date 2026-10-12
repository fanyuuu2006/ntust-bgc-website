import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { MembershipRegisterKeyCannotBeRevokedError } from "@/services/memberships/memberships.errors";
import { membershipService } from "@/services/memberships/memberships.service";
export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const authorization = await authorizeAdminRequest("您沒有管理社員註冊序號的權限"); if (authorization.response) return authorization.response; try { return NextResponse.json({ data: await membershipService.revokeRegisterKey((await params).id) }); } catch (error) { if (error instanceof MembershipRegisterKeyCannotBeRevokedError) return NextResponse.json({ message: error.message }, { status: 409 }); return unexpectedErrorResponse("[PATCH /api/admin/members/register-keys/[id]]", error, "撤銷社員註冊序號失敗"); }
  } catch (error) {
    return unexpectedErrorResponse("[PATCH /api/admin/members/register-keys/[id]]", error, "操作暫時無法完成，請稍後再試。");
  }
}
