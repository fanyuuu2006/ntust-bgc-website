import { NextResponse } from "next/server";
import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { eventsService } from "@/services/events/events.service";

async function admin() {
  const user = await getCurrentUser();
  return user && await isAdminByUserId(user.id);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await admin()) {
    return NextResponse.json({ message: "沒有管理權限" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const search = new URL(request.url).searchParams.get("search") ?? "";
    return NextResponse.json({ data: await eventsService.searchAttendanceUsersForAdmin(id, search) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "搜尋使用者失敗" },
      { status: 400 },
    );
  }
}
