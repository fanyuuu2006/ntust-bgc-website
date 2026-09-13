import type { JSONContent } from "@tiptap/react";

/**
 * Project Tiptap defaults (target/rel/class/list style) into the v1 payload.
 * The result deliberately remains unknown: projection is not validation, and
 * the server must reject unsupported structure even if this adapter was bypassed.
 */
export function canonicalEditorContent(node: JSONContent): unknown {
  return {
    type: node.type,
    ...(node.text !== undefined ? { text: node.text } : {}),
    ...(node.type === "heading" ? { attrs: { level: node.attrs?.level } } : {}),
    ...(node.type === "orderedList" ? { attrs: { start: node.attrs?.start ?? 1 } } : {}),
    ...(node.content ? { content: node.content.map(canonicalEditorContent) } : {}),
    ...(node.marks?.length ? { marks: node.marks.map((mark) => ({
      type: mark.type,
      ...(mark.type === "link" ? { attrs: { href: mark.attrs?.href } } : {}),
    })) } : {}),
  };
}
