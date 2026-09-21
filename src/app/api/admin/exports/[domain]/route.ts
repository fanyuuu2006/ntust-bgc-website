import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { createExportResponse, exportFormatSchema, ExportRowLimitExceededError } from "@/libs/export/export";
import { ADMIN_EXPORT_DOMAINS, adminExportsService } from "@/services/admin-exports/admin-exports.service";

const domainSchema = z.enum(ADMIN_EXPORT_DOMAINS);

export async function GET(request: Request, { params }: { params: Promise<{ domain: string }> }) {
  const authorization = await authorizeAdminRequest("您沒有匯出管理資料的權限");
  if (authorization.response) return authorization.response;

  try {
    const domain = domainSchema.parse((await params).domain);
    const url = new URL(request.url);
    const format = exportFormatSchema.parse(url.searchParams.get("format"));
    const query = Object.fromEntries(url.searchParams.entries());
    delete query.format;
    delete query.page;
    delete query.pageSize;
    const document = await adminExportsService.createDocument(domain, query);
    return createExportResponse(document, format);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ message: "匯出格式或篩選條件不正確" }, { status: 400 });
    }
    if (error instanceof ExportRowLimitExceededError) {
      return NextResponse.json({ message: error.message }, { status: 422 });
    }
    return unexpectedErrorResponse("[GET /api/admin/exports/[domain]]", error, "匯出資料失敗，請稍後再試");
  }
}
