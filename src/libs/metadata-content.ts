const METADATA_TITLE_MAX_LENGTH = 60;
const METADATA_DESCRIPTION_MAX_LENGTH = 160;

function normalizeMetadataText(text: string): string {
  return text.trim().replace(/\s+/gu, " ");
}

function truncateMetadataText(text: string, maxLength: number): string {
  const characters = Array.from(text);
  if (characters.length <= maxLength) return text;

  return `${characters.slice(0, maxLength - 1).join("")}…`;
}

export function createMetadataTitle(text: string): string {
  return truncateMetadataText(
    normalizeMetadataText(text),
    METADATA_TITLE_MAX_LENGTH,
  );
}

export function createMetadataDescription(text: string): string {
  return truncateMetadataText(
    normalizeMetadataText(text),
    METADATA_DESCRIPTION_MAX_LENGTH,
  );
}

export function getSafeMetadataImageUrl(
  value: string | null | undefined,
): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  if (/^\/(?!\/)/u.test(candidate)) return candidate;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}
