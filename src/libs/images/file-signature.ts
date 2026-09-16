export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedImageMimeType =
  (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];
export type SupportedImageExtension = "jpg" | "png" | "webp";

export type DetectedSupportedImage = {
  mimeType: SupportedImageMimeType;
  extension: SupportedImageExtension;
};

/** Header identification only; callers still enforce size and declared MIME. */
export function detectSupportedImage(
  bytes: Uint8Array,
): DetectedSupportedImage | null {
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
