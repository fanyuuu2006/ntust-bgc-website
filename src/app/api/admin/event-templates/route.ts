import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { eventTemplatesService } from "@/services/events/event-templates.service";

export async function GET() {
  const auth = await authorizeAdminRequest("管理活動範本");
  if (auth.response) return auth.response;
  return NextResponse.json({ data: await eventTemplatesService.list() });
}

export async function POST(request: Request) {
  const auth = await authorizeAdminRequest("管理活動範本");
  if (auth.response) return auth.response;
  try { return NextResponse.json({ data: await eventTemplatesService.create(await request.json()) }, { status: 201 }); }
  catch (error) { if (error instanceof ZodError) return NextResponse.json({ message: "範本資料格式不正確", errors: error.flatten().fieldErrors }, { status: 400 }); throw error; }
}
