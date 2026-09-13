import type { JSONContent } from "@tiptap/react";

/**
 * 將 Tiptap 預設 attributes（target／rel／class／清單樣式）整理成網站 v1 payload。
 * 結果刻意維持 unknown：欄位投影不是安全驗證，Server 仍須拒絕未支援結構，不能信任此 adapter 已被執行。
 */
export function canonicalEditorContent(node: JSONContent): unknown {
  return {
    type: node.type,
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(node.type === "videoEmbed" ? { attrs: ["youtube", "bilibili"].includes(node.attrs?.provider) ? { provider: node.attrs?.provider, videoId: node.attrs?.videoId } : { provider: node.attrs?.provider, src: node.attrs?.src } } : {}),
    ...(node.type === "audioEmbed" ? { attrs: { src: node.attrs?.src } } : {}),
    ...(node.type === "heading" ? { attrs: { level: node.attrs?.level } } : {}),
    ...(node.type === "orderedList" ? { attrs: { start: node.attrs?.start ?? 1 } } : {}),
    ...(node.content ? { content: node.content.map(canonicalEditorContent) } : {}),
    ...(node.marks?.length ? { marks: node.marks.map((mark) => ({
      type: mark.type,
      ...(mark.type === "link" ? { attrs: { href: mark.attrs?.href } } : {}),
    })) } : {}),
  };
}
