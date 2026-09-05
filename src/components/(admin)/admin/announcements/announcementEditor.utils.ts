export type AnnouncementSubmitIntent = "save" | "publish";

type BuildAnnouncementSubmitPayloadOptions = {
  title: string;
  content: string;
  currentPublished: boolean;
  intent: AnnouncementSubmitIntent;
};

export function buildAnnouncementSubmitPayload({
  title,
  content,
  currentPublished,
  intent,
}: BuildAnnouncementSubmitPayloadOptions) {
  return {
    title,
    content,
    is_published: intent === "publish" || currentPublished,
  };
}
