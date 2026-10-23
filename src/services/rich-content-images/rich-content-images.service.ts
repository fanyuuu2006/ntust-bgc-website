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

export type RichContentImageUploadStage =
  | "FILE_VALIDATION"
  | "CONFIG_CHECK"
  | "STORAGE_UPLOAD"
  | "PUBLIC_URL";

export class RichContentImageUploadError extends Error {
  constructor(public readonly stage: RichContentImageUploadStage, cause: unknown) {
    super("Rich Content image upload failed");
    this.name = "RichContentImageUploadError";
    this.cause = cause;
  }
}
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
      throw new RichContentImageUploadError("CONFIG_CHECK", new Error("origin mismatch"));
    }
    let validated: Awaited<ReturnType<typeof validateRichContentImageFile>>;
    try {
      validated = await validateRichContentImageFile(file);
    } catch (error) {
      if (error instanceof RichContentImageInputError) throw error;
      throw new RichContentImageUploadError("FILE_VALIDATION", error);
    }
    const { bytes, detected } = validated;
    const objectPath = createRichContentImageObjectPath(detected.extension);
    try {
      await richContentImagesRepository.upload(objectPath, bytes, detected.mimeType);
    } catch (error) {
      throw new RichContentImageUploadError("STORAGE_UPLOAD", error);
    }
    try {
      return { src: buildRichContentImagePublicUrl(objectPath, SUPABASE_URL) };
    } catch (error) {
      throw new RichContentImageUploadError("PUBLIC_URL", error);
    }
  },
};