import { Node } from "@tiptap/react";
import { isRichMediaNode, mediaSource, type RichMediaNode } from "./media";
import { canonicalEditorContent } from "./editor-document";

/**
 * 建立可選取的媒體 atom 與精簡編輯 preview；不在 editor 內請求第三方播放器。
 */
export function createMediaExtensions(onEdit?: (node: RichMediaNode) => void) {
  return ["videoEmbed", "audioEmbed"].map((name) => Node.create({
    name, group: "block", atom: true, selectable: true,
    addAttributes() {
      return name === "videoEmbed"
        ? { provider: { default: "youtube" }, videoId: { default: null }, src: { default: null } }
        : { src: { default: null } };
    },
    // 貼入文件的 HTML 不等於媒體匯入；只有媒體 Dialog 會執行 provider resolver。
    parseHTML() { return []; },
    renderHTML({ node }) {
      const candidate = canonicalEditorContent(node.toJSON());
      return ["div", { "data-media": name, class: "rich-editor-media" }, ["span", {}, isRichMediaNode(candidate) ? mediaSource(candidate) : "無效媒體"]];
    },
    addNodeView() {
      return ({ node, editor, getPos }) => {
        const candidate = canonicalEditorContent(node.toJSON());
        const dom = document.createElement("div");
        dom.className = "rich-editor-media"; dom.dataset.media = name; dom.contentEditable = "false";
        const title = document.createElement("strong");
        title.textContent = name === "audioEmbed" ? "音訊檔" : node.attrs.provider === "youtube" ? "YouTube" : node.attrs.provider === "bilibili" ? "Bilibili" : "影片檔";
        const source = document.createElement("span");
        source.textContent = isRichMediaNode(candidate) ? mediaSource(candidate) : "無效媒體";
        source.className = "rich-editor-media-source";
        const actions = document.createElement("div"); actions.className = "rich-editor-media-actions";
        for (const label of ["編輯", "移除"]) {
          const button = document.createElement("button"); button.type = "button"; button.textContent = label;
          button.setAttribute("aria-label", label + "媒體"); button.className = "btn ghost rounded-md px-2 min-h-8 text-xs";
          button.onmousedown = (event) => event.preventDefault();
          button.onclick = () => {
            if (!editor.isEditable) return;
            const from = getPos(); if (typeof from !== "number") return;
            if (label === "移除") editor.commands.deleteRange({ from, to: from + node.nodeSize });
            else if (isRichMediaNode(candidate)) { editor.commands.setNodeSelection(from); onEdit?.(candidate); }
          };
          actions.append(button);
        }
        dom.append(title, source, actions);
        return {
          dom,
          selectNode() { dom.classList.add("ProseMirror-selectednode"); },
          deselectNode() { dom.classList.remove("ProseMirror-selectednode"); },
          stopEvent: (event) => event.target instanceof Element && !!event.target.closest("button"),
          ignoreMutation: () => true,
        };
      };
    },
  }));
}
