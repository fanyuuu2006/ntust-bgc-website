import "server-only";

import {
  buildRichContentImagePublicUrl,
  createRichContentImageObjectPath,
  richContentImageOriginsMatch,
  RICH_CONTENT_IMAGE_MAX_BYTES,
} from "@/libs/rich-content/image";
import { richContentImagesRepository } from "@/repositories/rich-content-images.repository";
import { SUPABASE_URL } from "@/libs/env";
import { RichContentImageInputError } from "./rich-content-images.errors";
import {
  detectSupportedImage,
  type DetectedSupportedImage,
} from "@/libs/images/file-signature";

export async function validateRichContentImageFile(file: File): Promise<{
  bytes: Uint8Array;
  detected: DetectedSupportedImage;
}> {
  if (file.size === 0) throw new RichContentImageInputError("圖片檔案不可為空");
  if (file.size > RICH_CONTENT_IMAGE_MAX_BYTES) {
    throw new RichContentImageInputError("圖片檔案不可超過 4 MiB");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectSupportedImage(bytes);
  if (!detected) {
    throw new RichContentImageInputError("僅支援 JPEG、PNG 或 WebP 圖片");
  }
  if (file.type !== detected.mimeType) {
    throw new RichContentImageInputError("圖片格式與檔案內容不一致");
  }
  return { bytes, detected };
}

export const richContentImagesService = {
  upload: async (file: File): Promise<{ src: string }> => {
    if (!richContentImageOriginsMatch(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    )) {
      throw new Error("Rich Content 圖片的 Supabase 公開 origin 設定不一致");
    }
    const { bytes, detected } = await validateRichContentImageFile(file);
    const objectPath = createRichContentImageObjectPath(detected.extension);
    await richContentImagesRepository.upload(
      objectPath,
      bytes,
      detected.mimeType,
    );
    return { src: buildRichContentImagePublicUrl(objectPath, SUPABASE_URL) };
  },
};
