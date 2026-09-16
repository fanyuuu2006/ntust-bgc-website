import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { richContentImagesService } from "@/services/rich-content-images/rich-content-images.service";
import { RichContentImageInputError } from "@/services/rich-content-images/rich-content-images.errors";

export async function POST(request: Request) {
  try {
    const authorization = await authorizeAdminRequest("您沒有上傳內容圖片的權限");
    if (authorization.response) return authorization.response;

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { message: "請使用 multipart/form-data 上傳一張圖片" },
        { status: 400 },
      );
    }

    const entries = [...formData.entries()];
    const files = entries.filter((entry): entry is [string, File] =>
      typeof entry[1] !== "string"
    );
    if (
      entries.length !== 1 || files.length !== 1 ||
      files[0][0] !== "file"
    ) {
      return NextResponse.json(
        { message: "請提供一個名為 file 的圖片檔案" },
        { status: 400 },
      );
    }

    try {
      const data = await richContentImagesService.upload(files[0][1]);
      return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
      if (error instanceof RichContentImageInputError) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      return unexpectedErrorResponse(
        "[POST /api/admin/rich-content/images]",
        error,
        "圖片上傳失敗，請稍後再試",
      );
    }
  } catch (error) {
    return unexpectedErrorResponse(
      "[POST /api/admin/rich-content/images]",
      error,
      "操作暫時無法完成，請稍後再試。",
    );
  }
}
