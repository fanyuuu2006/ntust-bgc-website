import { z } from "zod";
import { isRichMediaNode, mediaSource, type RichMediaNode } from "./media";

export const RICH_TEXT_MAX_LENGTH = 20_000;
// 分別限制文字、序列化位元組、節點與深度，控制儲存量和走訪成本；很少的可見文字也可能帶有大量結構。
export const RICH_TEXT_MAX_BYTES = 120_000;
const MAX_NODES = 4_000;
const MAX_DEPTH = 16;

export type RichMark = { type: "bold" | "italic" } | { type: "link"; attrs: { href: string } };
export type RichInline = { type: "text"; text: string; marks?: RichMark[] } | { type: "hardBreak" };
export type RichBlock =
  | { type: "paragraph"; content?: RichInline[] }
  | { type: "heading"; attrs: { level: 2 | 3 | 4 }; content?: RichInline[] }
  | { type: "bulletList"; content: RichListItem[] }
  | { type: "orderedList"; attrs?: { start: number }; content: RichListItem[] }
  | { type: "blockquote"; content: RichBlock[] }
  | { type: "horizontalRule" }
  | RichMediaNode;
export type RichListItem = { type: "listItem"; content: RichBlock[] };
export type RichContent = { type: "doc"; content: RichBlock[] };
export type StoredRichContent = { content: string; content_format?: string; rich_content?: unknown };

/**
 * 只接受完整 http／https 網址，供 Editor 與 Server 共用。
 * 先拒絕控制字元、空白及帳密，避免瀏覽器 URL 正規化後把不安全輸入偽裝成另一個合法目的地。
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

// 在遞迴解析／序列化前先限制走訪成本，也涵蓋呼叫者直接傳入的物件與循環參照。
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
      // 頁面 entity title 擁有 H1；文件章節僅允許 H2／H3／H4。
      case "heading": return keys(value, ["type", "attrs", "content"]) && record(value.attrs) && keys(value.attrs, ["level"]) && [2, 3, 4].includes(value.attrs.level as number) && children("inline", false);
      case "videoEmbed": case "audioEmbed": return isRichMediaNode(value);
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
 * 將已驗證的 v1 文件轉成搜尋、摘要與 SEO 用的純文字。
 * 區塊分隔保留閱讀順序和 legacy 空行；mark 不改變搜尋文字。呼叫前必須先驗證 unknown 輸入。
 */
export function plainTextFromRichContent(document: RichContent): string {
  function text(node: RichBlock | RichInline | RichListItem): string {
    switch (node.type) {
      case "text": return node.text;
      case "hardBreak": return "\n";
      case "horizontalRule": return "";
      case "videoEmbed": case "audioEmbed": return mediaSource(node);
      case "paragraph": case "heading": return node.content?.map(text).join("") ?? "";
      case "bulletList": case "orderedList": return node.content.map(text).join("\n");
      default: return node.content.map(text).join("\n\n");
    }
  }
  return document.content.map(text).join("\n\n");
}

/**
 * Rich Content 持久化／渲染前的信任邊界，不能只依賴 TypeScript 或 Client 工具列。
 * 拒絕未支援節點、attributes、marks、不安全 URL 及超限文件，不解析 HTML。
 * 允許選填描述使用空文件；必填內容由 richContentSchema 額外檢查。
 */
export const richDocumentSchema = z.custom<RichContent>(validDocument, "內容格式不支援或超過大小限制").superRefine((document, ctx) => {
  // 前面的自訂驗證可能已失敗；不能再走訪不合法的文件結構。
  if (!validDocument(document)) return;
  const text = plainTextFromRichContent(document);
  if (text.length > RICH_TEXT_MAX_LENGTH) ctx.addIssue({ code: "custom", message: "內容不得超過 20,000 字元" });
});

/**
 * 必填內容拒絕肉眼不可見的空文件；選填描述使用 richDocumentSchema。
 */
export const richContentSchema = richDocumentSchema.refine((document) => !validDocument(document) || !!plainTextFromRichContent(document).replace(/[\s\u200b-\u200d\ufeff]/gu, ""), "請輸入內容");

/**
 * 將 legacy 純文字確定性地轉為 editor 文件，不把 HTML／Markdown 字樣解讀成格式。
 * CR／CRLF 正規化為 LF；雙換行分段、單換行轉 hardBreak，保留空段落。
 * 空結果可用於新表單初始化，但不代表通過必填驗證。
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

/**
 * 讀取已驗證的 v1 文件；不支援或不合法時回傳 null，讓呼叫者安全退回純文字。
 */
export function readRichContent(value: StoredRichContent): RichContent | null {
  if (value.content_format !== "rich_text_v1") return null;
  const result = richContentSchema.safeParse(value.rich_content);
  return result.success ? result.data : null;
}

/**
 * 提供卡片／SEO 的純文字，使用明確 content_format，不猜測舊字串是否為 JSON 或 HTML。
 */
export function plainTextFromStoredContent(value: StoredRichContent): string {
  const document = readRichContent(value);
  return document ? plainTextFromRichContent(document) : value.content;
}

/**
 * 為新文件、legacy 文字或支援的 rich 文件初始化 editor。
 * 退回純文字不代表允許覆寫未知版本；表單另行阻止這種儲存。
 */
export function editableRichContent(value?: StoredRichContent): RichContent {
  return value ? readRichContent(value) ?? richContentFromPlainText(value.content) : richContentFromPlainText("");
}
