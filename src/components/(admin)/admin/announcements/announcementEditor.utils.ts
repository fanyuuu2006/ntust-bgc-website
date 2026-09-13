import type { RichContent } from "@/libs/rich-content/content";

export type AnnouncementSubmitIntent = "save" | "publish";

type BuildAnnouncementSubmitPayloadOptions = {
  title: string;
  currentPublished: boolean;
  intent: AnnouncementSubmitIntent;
} & ({ content: string; richContent?: never } | { richContent: RichContent; content?: never });

export function buildAnnouncementSubmitPayload({
  title,
  content,
  richContent,
  currentPublished,
  intent,
}: BuildAnnouncementSubmitPayloadOptions) {
  return {
    title,
    ...(richContent ? { content_format: "rich_text_v1" as const, rich_content: richContent } : { content }),
    is_published: intent === "publish" || currentPublished,
  };
}
