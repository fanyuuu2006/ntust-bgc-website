import { z } from "zod";

export const RICH_TEXT_MAX_LENGTH = 20_000;
// Independent text, byte, node and depth limits bound both storage overhead and
// traversal cost; a small amount of visible text can still contain huge markup.
export const RICH_TEXT_MAX_BYTES = 120_000;
const MAX_NODES = 4_000;
const MAX_DEPTH = 16;

export type RichMark = { type: "bold" | "italic" } | { type: "link"; attrs: { href: string } };
export type RichInline = { type: "text"; text: string; marks?: RichMark[] } | { type: "hardBreak" };
export type RichBlock =
  | { type: "paragraph"; content?: RichInline[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: RichInline[] }
  | { type: "bulletList"; content: RichListItem[] }
  | { type: "orderedList"; attrs?: { start: number }; content: RichListItem[] }
  | { type: "blockquote"; content: RichBlock[] }
  | { type: "horizontalRule" };
export type RichListItem = { type: "listItem"; content: RichBlock[] };
export type RichContent = { type: "doc"; content: RichBlock[] };
export type StoredRichContent = { content: string; content_format?: string; rich_content?: unknown };

/**
 * Accept absolute web URLs only. Shared by editor link controls and validation;
 * browser URL normalization must not turn control characters or credentials
 * into a different, apparently safe author-supplied destination.
 */
export function isSafeRichLink(href: string): boolean {
  if (href.length > 2_048 || /[\s\u0000-\u001f\u007f]/u.test(href) || !/^https?:\/\//i.test(href)) return false;
  try {
    const url = new URL(href);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

// Bound traversal before recursive parsing/stringification, including objects passed directly by a caller.
function withinBudget(value: unknown): boolean {
  const pending = [{ value, depth: 0 }];
  let entries = 0;
  while (pending.length) {
    const item = pending.pop()!;
    if (++entries > MAX_NODES * 8 || item.depth > MAX_DEPTH * 3) return false;
    if (typeof item.value === "string" && item.value.length > RICH_TEXT_MAX_BYTES) return false;
    if (item.value && typeof item.value === "object") {
      const values = Object.values(item.value);
      if (values.length > MAX_NODES) return false;
      for (const child of values) pending.push({ value: child, depth: item.depth + 1 });
    }
  }
  try { return new TextEncoder().encode(JSON.stringify(value)).length <= RICH_TEXT_MAX_BYTES; }
  catch { return false; }
}

function validDocument(value: unknown): value is RichContent {
  if (!withinBudget(value)) return false;
  let nodes = 0;
  function node(value: unknown, kind: "doc" | "block" | "inline" | "item", depth: number): boolean {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH || !record(value)) return false;
    const children = (childKind: typeof kind, required = true) =>
      (!required && value.content === undefined) || (Array.isArray(value.content) && (!required || value.content.length > 0) && value.content.every((child) => node(child, childKind, depth + 1)));
    if (kind === "doc") return value.type === "doc" && keys(value, ["type", "content"]) && children("block");
    if (kind === "inline") {
      if (value.type === "hardBreak") return keys(value, ["type"]);
      if (value.type !== "text" || !keys(value, ["type", "text", "marks"]) || typeof value.text !== "string" || !value.text.length) return false;
      if (value.marks === undefined) return true;
      if (!Array.isArray(value.marks) || value.marks.length > 3) return false;
      const seen = new Set();
      return value.marks.every((mark) => {
        if (!record(mark) || seen.has(mark.type)) return false;
        seen.add(mark.type);
        if (mark.type === "bold" || mark.type === "italic") return keys(mark, ["type"]);
        return mark.type === "link" && keys(mark, ["type", "attrs"]) && record(mark.attrs) && keys(mark.attrs, ["href"]) && typeof mark.attrs.href === "string" && isSafeRichLink(mark.attrs.href);
      });
    }
    if (kind === "item") return value.type === "listItem" && keys(value, ["type", "content"]) && children("block") && record((value.content as unknown[])[0]) && (value.content as Record<string, unknown>[])[0].type === "paragraph";
    switch (value.type) {
      case "paragraph": return keys(value, ["type", "content"]) && children("inline", false);
      case "heading": return keys(value, ["type", "attrs", "content"]) && record(value.attrs) && keys(value.attrs, ["level"]) && [2, 3].includes(value.attrs.level as number) && children("inline", false);
      case "horizontalRule": return keys(value, ["type"]);
      case "blockquote": return keys(value, ["type", "content"]) && children("block");
      case "bulletList": return keys(value, ["type", "content"]) && children("item");
      case "orderedList": return keys(value, ["type", "attrs", "content"]) && (value.attrs === undefined || (record(value.attrs) && keys(value.attrs, ["start"]) && Number.isInteger(value.attrs.start) && Number(value.attrs.start) >= 1 && Number(value.attrs.start) <= 9999)) && children("item");
      default: return false;
    }
  }
  return node(value, "doc", 0);
}

/**
 * Extract search/excerpt/metadata text from an already validated v1 document.
 * Block separators preserve reading order and legacy blank lines; marks never
 * affect searchable text. Validate unknown input before calling this traversal.
 */
export function plainTextFromRichContent(document: RichContent): string {
  function text(node: RichBlock | RichInline | RichListItem): string {
    switch (node.type) {
      case "text": return node.text;
      case "hardBreak": return "\n";
      case "horizontalRule": return "";
      case "paragraph": case "heading": return node.content?.map(text).join("") ?? "";
      case "bulletList": case "orderedList": return node.content.map(text).join("\n");
      default: return node.content.map(text).join("\n\n");
    }
  }
  return document.content.map(text).join("\n\n");
}

/**
 * Trust boundary for untrusted rich JSON before persistence or rendering.
 * Reject unsupported nodes, attributes, marks, unsafe URLs and oversized or
 * visually empty documents. No arbitrary HTML is interpreted or sanitized here.
 */
export const richContentSchema = z.custom<RichContent>(validDocument, "內容格式不支援或超過大小限制").superRefine((document, ctx) => {
  // custom validation can fail before this refinement; do not traverse invalid data.
  if (!validDocument(document)) return;
  const text = plainTextFromRichContent(document);
  if (!text.replace(/[\s\u200b-\u200d\ufeff]/gu, "")) ctx.addIssue({ code: "custom", message: "請輸入公告內容" });
  if (text.length > RICH_TEXT_MAX_LENGTH) ctx.addIssue({ code: "custom", message: "內容不得超過 20,000 字元" });
});

/**
 * Lossless legacy conversion except CR/CRLF normalization to LF.
 * Double newlines separate paragraphs; single newlines become hardBreak nodes.
 * Preserve empty paragraphs and treat HTML/Markdown-looking strings literally.
 * An empty result is useful for a new editor but is not valid for saving.
 */
export function richContentFromPlainText(text: string): RichContent {
  return {
    type: "doc",
    content: text.replace(/\r\n?/g, "\n").split("\n\n").map((paragraph) => ({
      type: "paragraph",
      content: paragraph.split("\n").flatMap<RichInline>((line, index) => [
        ...(index ? [{ type: "hardBreak" as const }] : []),
        ...(line ? [{ type: "text" as const, text: line }] : []),
      ]),
    })),
  };
}

/** Return validated v1 content, or null so callers can safely use plain text. */
export function readRichContent(value: StoredRichContent): RichContent | null {
  if (value.content_format !== "rich_text_v1") return null;
  const result = richContentSchema.safeParse(value.rich_content);
  return result.success ? result.data : null;
}

/** Provide plain text for cards/SEO without guessing a legacy string's format. */
export function plainTextFromStoredContent(value: StoredRichContent): string {
  const document = readRichContent(value);
  return document ? plainTextFromRichContent(document) : value.content;
}

/**
 * Seed new, legacy or supported rich editors. A fallback does not authorize
 * overwriting unsupported versions: the form separately blocks that save.
 */
export function editableRichContent(value?: StoredRichContent): RichContent {
  return value ? readRichContent(value) ?? richContentFromPlainText(value.content) : richContentFromPlainText("");
}
