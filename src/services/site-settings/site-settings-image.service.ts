import "server-only";

import { randomUUID } from "node:crypto";
import { detectSupportedImage } from "@/libs/images/file-signature";
import { buildSiteMediaUrl } from "@/libs/media/media-url";
import { createStorageMediaReference } from "@/libs/media/media-path";
import { siteSettingsImageRepository } from "@/repositories/site-settings-image.repository";

const MAX_BYTES = 4 * 1024 * 1024;
const fields = new Set(["logo", "favicon", "og", "hero"]);

export const siteSettingsImageService = {
  upload: async (field: string, file: File) => {
    if (!fields.has(field)) throw new Error("Invalid image field");
    if (file.size === 0 || file.size > MAX_BYTES) throw new Error("Image size must be between 1 byte and 4 MiB");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = detectSupportedImage(bytes);
    if (!detected || detected.mimeType !== file.type) throw new Error("Only JPEG, PNG, and WebP images are supported");
    const objectPath = `site-settings/${field}-${randomUUID()}.${detected.extension}`;
    await siteSettingsImageRepository.upload(objectPath, bytes, detected.mimeType);
    const reference = createStorageMediaReference("rich-content-images", objectPath);
    if (!reference) throw new Error("Invalid generated media path");
    return { src: buildSiteMediaUrl(reference) };
  },
};
