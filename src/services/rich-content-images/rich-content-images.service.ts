import "server-only";

import {
  buildRichContentImagePublicUrl,
  createRichContentImageObjectPath,
  richContentImageOriginsMatch,
  RICH_CONTENT_IMAGE_MAX_BYTES,
  type RichContentImageMimeType,
} from "@/libs/rich-content/image";
import { richContentImagesRepository } from "@/repositories/rich-content-images.repository";
import { SUPABASE_URL } from "@/libs/env";
import { RichContentImageInputError } from "./rich-content-images.errors";

type DetectedImage = {
  mimeType: RichContentImageMimeType;
  extension: "jpg" | "png" | "webp";
};

function detectImage(bytes: Uint8Array): DetectedImage | null {
  if (
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return { mimeType: "image/jpeg", extension: "jpg" };
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value)
  ) return { mimeType: "image/png", extension: "png" };
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return { mimeType: "image/webp", extension: "webp" };
  return null;
}

export async function validateRichContentImageFile(file: File): Promise<{
  bytes: Uint8Array;
  detected: DetectedImage;
}> {
  if (file.size === 0) throw new RichContentImageInputError("圖片檔案不可為空");
  if (file.size > RICH_CONTENT_IMAGE_MAX_BYTES) {
    throw new RichContentImageInputError("圖片檔案不可超過 4 MiB");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectImage(bytes);
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
