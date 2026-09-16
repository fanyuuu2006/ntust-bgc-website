import { Node } from "@tiptap/react";
import { canonicalEditorContent } from "./editor-document";
import { normalizeRichImageNode } from "./image";

export const RichContentImageExtension = Node.create({
  name: "image",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      caption: { default: null },
    };
  },
  // 不接受貼入 HTML 成為受信任圖片；只接受未來 upload API 產生的 canonical node。
  parseHTML() { return []; },
  renderHTML({ node }) {
    const image = normalizeRichImageNode(canonicalEditorContent(node.toJSON()));
    if (!image) return ["div", { "data-media": "invalid-image" }, "無效圖片"];
    return [
      "figure",
      { "data-media": "image", class: "rich-content-image rich-editor-image" },
      ["img", {
        src: image.attrs.src,
        alt: image.attrs.alt,
        draggable: "false",
      }],
      ...(image.attrs.caption
        ? [["figcaption", {}, image.attrs.caption]]
        : []),
    ];
  },
});
