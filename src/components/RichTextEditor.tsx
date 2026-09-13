"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { isSafeRichLink, type RichContent } from "@/libs/rich-content/content";
import { canonicalEditorContent } from "@/libs/rich-content/editor-document";

/** Keep the editor's enabled nodes/marks aligned with the v1 application schema. */
export function createRichTextExtensions() {
  return [
    StarterKit.configure({
      // The announcement title already owns H1 on the public page.
      heading: { levels: [2, 3] },
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      trailingNode: false,
      link: {
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        isAllowedUri: isSafeRichLink,
        HTMLAttributes: { target: null, rel: null, class: null },
      },
    }),
  ];
}

type RichTextEditorProps = {
  id: string;
  label: string;
  initialContent: RichContent;
  onChange: (content: unknown) => void;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
};

/**
 * Client-side React function component around a Tiptap Editor instance.
 * Emits projected, still-untrusted JSON on document changes. The form validates
 * it before submission; the server validates again and derives searchable text.
 * initialContent seeds a mount, not every render, so failed saves retain edits.
 */
export function RichTextEditor({
  id,
  label,
  initialContent,
  onChange,
  disabled = false,
  required = false,
  invalid = false,
}: RichTextEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    // Next.js may pre-render this client component; create the editable DOM only
    // after hydration, rather than producing a different server document.
    immediatelyRender: false,
    extensions: createRichTextExtensions(),
    content: initialContent,
    // Selection-only transactions update the toolbar, not the parent's document.
    onUpdate: ({ editor }) =>
      onChange(canonicalEditorContent(editor.getJSON())),
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        "aria-required": String(required),
        "aria-placeholder": "輸入公告內容…",
        "data-placeholder": "輸入公告內容…",
        class:
          "rich-content rich-editor-content min-h-64 min-w-0 max-w-full p-4 outline-none sm:min-h-80 sm:p-5",
      },
    },
  });
  useEffect(() => {
    editor?.setEditable(!disabled);
    editor?.view.dom.setAttribute("aria-invalid", String(invalid));
    if (invalid)
      editor?.view.dom.setAttribute("aria-describedby", `${id}-error`);
    else editor?.view.dom.removeAttribute("aria-describedby");
  }, [editor, disabled, invalid, id]);
  useEffect(() => {
    if (linkOpen) {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    }
  }, [linkOpen]);
  // Subscribe to editor transactions so cursor movement also refreshes pressed
  // states. React form state alone cannot describe formatting at the selection.
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            empty: editor.isEmpty,
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            quote: editor.isActive("blockquote"),
            link: editor.isActive("link"),
            heading: editor.isActive("heading", { level: 2 })
              ? "2"
              : editor.isActive("heading", { level: 3 })
                ? "3"
                : "paragraph",
            undo: editor.can().undo(),
            redo: editor.can().redo(),
          }
        : null,
  });

  function applyLink() {
    if (!editor) return;
    const href = url.trim();
    if (!isSafeRichLink(href)) {
      setLinkError("請輸入完整的 http:// 或 https:// 網址。");
      return;
    }
    // Tiptap retains its selection while the URL input has DOM focus. Restore
    // editor focus and expand an existing link so editing updates the full mark.
    const chain = editor.chain().focus().extendMarkRange("link");
    if (editor.state.selection.empty && !editor.isActive("link"))
      chain
        .insertContent({
          type: "text",
          text: href,
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    else chain.setLink({ href }).run();
    setLinkOpen(false);
    setLinkError("");
  }

  const actions = [
    {
      group: "復原與重做",
      label: "復原",
      Icon: Undo2,
      enabled: state?.undo,
      run: () => editor?.chain().focus().undo().run(),
    },
    {
      group: "復原與重做",
      label: "重做",
      Icon: Redo2,
      enabled: state?.redo,
      run: () => editor?.chain().focus().redo().run(),
    },
    {
      group: "文字樣式",
      label: "粗體",
      Icon: Bold,
      pressed: state?.bold,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      group: "文字樣式",
      label: "斜體",
      Icon: Italic,
      pressed: state?.italic,
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      group: "清單",
      label: "項目符號清單",
      Icon: List,
      pressed: state?.bullet,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      group: "清單",
      label: "編號清單",
      Icon: ListOrdered,
      pressed: state?.ordered,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      group: "引言與插入",
      label: "引言",
      Icon: Quote,
      pressed: state?.quote,
      run: () => editor?.chain().focus().toggleBlockquote().run(),
    },
    {
      group: "引言與插入",
      label: "新增或編輯連結",
      Icon: Link2,
      pressed: state?.link,
      run: () => {
        setUrl(editor?.getAttributes("link").href ?? "");
        setLinkError("");
        setLinkOpen(!linkOpen);
      },
    },
    {
      group: "引言與插入",
      label: "分隔線",
      Icon: Minus,
      run: () => editor?.chain().focus().setHorizontalRule().run(),
    },
  ];

  return (
    <div className="rich-editor min-w-0 max-w-full rounded-xl border border-(--border-default) bg-(--surface-default)" data-empty={state?.empty ?? true}>
      <div
        role="group"
        aria-label="內容格式"
        className="rich-editor-toolbar flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-t-xl border-b border-(--border-muted) p-2"
      >
        <Select
          aria-label="段落層級"
          value={state?.heading ?? "paragraph"}
          disabled={disabled || !editor}
          className="rich-editor-heading w-auto max-w-full text-sm"
          onChange={(event) => {
            const level = event.target.value;
            if (level === "paragraph")
              editor?.chain().focus().setParagraph().run();
            else
              editor
                ?.chain()
                .focus()
                .setHeading({ level: level === "2" ? 2 : 3 })
                .run();
          }}
        >
          <option value="paragraph">內文</option>
          <option value="2">大標題</option>
          <option value="3">小標題</option>
        </Select>
        {["復原與重做", "文字樣式", "清單", "引言與插入"].map((group) => (
          <div key={group} role="group" aria-label={group} className="flex max-w-full items-center gap-0.5">
            {actions.filter((action) => action.group === group).map(({ label, Icon, run, pressed, enabled }) => (
              <Button
                key={label}
                variant="ghost"
                size="sm"
                iconOnly
                className="rich-editor-action shrink-0"
                aria-label={label}
                title={label}
                aria-pressed={pressed}
                disabled={disabled || !editor || enabled === false}
                onMouseDown={(event) => {
                  // Prevent mouse focus transfer from collapsing the DOM selection.
                  // Keyboard activation still uses onClick and restores editor focus.
                  if (event.button === 0) event.preventDefault();
                }}
                onClick={run}
              >
                <Icon aria-hidden="true" className="size-4" />
              </Button>
            ))}
          </div>
        ))}
      </div>
      {linkOpen ? (
        <div className="space-y-2 border-b border-(--border-muted) p-3">
          <label htmlFor={`${id}-link`} className="text-sm font-medium">
            連結網址
          </label>
          <Input
            ref={linkInputRef}
            id={`${id}-link`}
            value={url}
            type="url"
            placeholder="https://example.com"
            disabled={disabled}
            aria-invalid={!!linkError}
            aria-describedby={linkError ? `${id}-link-error` : undefined}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setLinkOpen(false);
                editor?.commands.focus();
              }
            }}
          />
          {linkError ? (
            <p
              id={`${id}-link-error`}
              role="alert"
              className="text-sm text-(--status-danger)"
            >
              {linkError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={applyLink} disabled={disabled}>
              套用連結
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled || !state?.link}
              onClick={() => {
                editor
                  ?.chain()
                  .focus()
                  .extendMarkRange("link")
                  .unsetLink()
                  .run();
                setLinkOpen(false);
              }}
            >
              移除連結
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setLinkOpen(false);
                editor?.commands.focus();
              }}
            >
              取消
            </Button>
          </div>
        </div>
      ) : null}
      {editor ? (
        <EditorContent editor={editor} className="min-w-0 max-w-full" />
      ) : (
        <p role="status" className="min-h-64 p-4 text-sm text-(--text-muted)">
          正在載入編輯器…
        </p>
      )}
    </div>
  );
}
