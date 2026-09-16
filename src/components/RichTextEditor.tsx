"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { createMediaExtensions } from "@/libs/rich-content/editor-media";
import {
  resolveMediaInput,
  mediaSource,
  isRichMediaNode,
  type MediaKind,
  type RichMediaNode,
} from "@/libs/rich-content/media";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Film,
  Image as ImageIcon,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { isSafeRichLink, type RichContent } from "@/libs/rich-content/content";
import { canonicalEditorContent } from "@/libs/rich-content/editor-document";
import { RichContentImageExtension } from "@/libs/rich-content/editor-image";
import {
  isCanonicalRichContentImageUrl,
  RICH_CONTENT_IMAGE_MAX_BYTES,
  RICH_CONTENT_IMAGE_MIME_TYPES,
  type RichImageNode,
} from "@/libs/rich-content/image";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function validateImageFile(file: File): string | null {
  if (file.size === 0) return "圖片檔案不能是空白檔案。";
  if (file.size > RICH_CONTENT_IMAGE_MAX_BYTES) {
    return "圖片檔案不得超過 4 MiB。";
  }
  if (
    !RICH_CONTENT_IMAGE_MIME_TYPES.includes(
      file.type as (typeof RICH_CONTENT_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return "僅支援 JPEG、PNG 或 WebP 圖片。";
  }
  return null;
}

function imageFileLabel(file: File, source: "picker" | "clipboard"): string {
  if (
    source === "clipboard" &&
    (!file.name || /^image\.(?:jpe?g|png|webp)$/i.test(file.name))
  ) {
    return "剪貼簿圖片";
  }
  return file.name || "剪貼簿圖片";
}

function imageFilesFromClipboard(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files = [...data.files].filter((file) => file.type.startsWith("image/"));
  if (files.length > 0) return files;
  return [...(data.items ?? [])]
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}

function RequiredIndicator() {
  return <span aria-hidden="true" className="ml-0.5 text-(--status-danger)">*</span>;
}

/**
 * 讓 Tiptap 啟用的節點與 mark 對齊網站 v1 schema；工具列不是 Server 驗證的替代品。
 */
export function createRichTextExtensions(
  onEditMedia?: (node: RichMediaNode) => void,
) {
  return [
    RichContentImageExtension,
    ...createMediaExtensions(onEditMedia),
    StarterKit.configure({
      // 公告／桌遊／活動名稱由頁面擁有 H1；作者內容只開放 H2／H3／H4。
      heading: { levels: [2, 3, 4] },
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
 * 以 React FC／hooks 管理 Tiptap Editor 實例。
 * 文件變動時輸出整理過、但仍不可信的 JSON；表單先驗證，Server 再驗證並衍生搜尋文字。
 * initialContent 僅在掛載時初始化，避免儲存失敗或重新 render 時覆蓋未儲存內容。
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
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaKind, setMediaKind] = useState<MediaKind>("auto");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaError, setMediaError] = useState("");
  const mediaInputRef = useRef<HTMLTextAreaElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [textError, setTextError] = useState("");
  const linkTextRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [linkSelection, setLinkSelection] = useState<{ from: number; to: number; existing: boolean } | null>(null);
  const [imageOpen, setImageOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageFileSource, setImageFileSource] = useState<
    "picker" | "clipboard"
  >("picker");
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [imageDecorative, setImageDecorative] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imagePending, setImagePending] = useState(false);
  const [imageTarget, setImageTarget] = useState<{
    position: number;
    existing: RichImageNode | null;
  } | null>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  function showMedia(node?: RichMediaNode) {
    setMediaKind("auto");
    setMediaUrl(node ? mediaSource(node) : "");
    setLinkOpen(false);
    setMediaError("");
    setMediaOpen(true);
  }

  function showImageInsert(position: number, file?: File) {
    if (disabled) return;
    setImageTarget({ position, existing: null });
    setImageFile(file ?? null);
    setImageFileSource(file ? "clipboard" : "picker");
    setImageAlt("");
    setImageCaption("");
    setImageDecorative(false);
    setImageError(file ? validateImageFile(file) ?? "" : "");
    setImageOpen(true);
  }
  const editor = useEditor({
    // Next.js 可能預先渲染 Client Component；等 hydration 後才建立可編輯 DOM，避免 SSR 不一致。
    immediatelyRender: false,
    extensions: createRichTextExtensions(showMedia),
    content: initialContent,
    // 只有文件變動才同步表單；游標／選取範圍變動只更新工具列狀態。
    onUpdate: ({ editor }) =>
      onChange(canonicalEditorContent(editor.getJSON())),
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        "aria-required": String(required),
        "aria-placeholder": `輸入${label}…`,
        "data-placeholder": `輸入${label}…`,
        class:
          "rich-content rich-editor-content min-w-0 max-w-full outline-none",
      },
      handlePaste: (view, event) => {
        const imageFiles = imageFilesFromClipboard(event.clipboardData);
        if (imageFiles.length === 0) return false;

        event.preventDefault();
        const file =
          imageFiles.find((candidate) =>
            RICH_CONTENT_IMAGE_MIME_TYPES.includes(
              candidate.type as (typeof RICH_CONTENT_IMAGE_MIME_TYPES)[number],
            ),
          ) ?? imageFiles[0];
        showImageInsert(view.state.selection.from, file);
        return true;
      },
      handleDrop: (_view, event) =>
        [...(event.dataTransfer?.files ?? [])].some((file) =>
          file.type.startsWith("image/"),
        ),
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
      const input = linkTextRef.current?.value ? linkInputRef.current : linkTextRef.current;
      input?.focus({ preventScroll: true });
      input?.select();
    }
  }, [linkOpen]);
  // 訂閱 Tiptap transaction，讓游標移入既有格式時也更新按鈕狀態；單靠表單 state 無法得知選取處的 mark。
  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            empty: editor.isEmpty,
            media:
              editor.isActive("videoEmbed") || editor.isActive("audioEmbed"),
            image: editor.isActive("image"),
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
                : editor.isActive("heading", { level: 4 })
                  ? "4"
                  : "paragraph",
            undo: editor.can().undo(),
            redo: editor.can().redo(),
          }
        : null,
  });

  function openLink() {
    if (!editor) return;
    const existing = editor.isActive("link");
    // 游標在既有連結內時，編輯／移除應涵蓋整個 mark，而不只是游標位置。
    if (existing) editor.commands.extendMarkRange("link");
    const { from, to } = editor.state.selection;
    setLinkSelection({ from, to, existing });
    setUrl(existing ? editor.getAttributes("link").href ?? "" : "");
    setLinkText(editor.state.doc.textBetween(from, to, "\n"));
    setTextError("");
    setLinkError("");
    setMediaOpen(false);
    setLinkOpen(true);
  }

  function closeLink() {
    setLinkOpen(false);
    // native Modal 開啟時底層 editor 是 inert；關閉後才還原焦點，避免整頁跳動。
    requestAnimationFrame(() => {
      if (!editor || editor.isDestroyed) return;
      editor.commands.focus(undefined, { scrollIntoView: false });
    });
  }

  function applyLink(remove = false) {
    if (!editor || disabled || !linkSelection) return;
    const selection = linkSelection;
    if (!remove && !linkText.trim()) {
      setTextError("請輸入顯示文字。");
      return;
    }
    setTextError("");
    const href = url.trim();
    if (!remove && !isSafeRichLink(href)) {
      setLinkError("請輸入不含帳密的完整 http:// 或 https:// 網址。");
      return;
    }
    // Modal 的 URL 輸入會取得 DOM 焦點，因此使用開啟時保存的範圍。
    // 先還原文件 selection 並更新 mark，再於 Modal 關閉後恢復可編輯焦點。
    /**
     * Modal 取得焦點後仍使用開啟時保存的範圍，避免連結套到別處。
     * 文字未改時只更新 mark，保留選取範圍內原有的粗體、斜體與段落結構；
     * 改名或游標插入則以單一 transaction 替換文字，讓復原能一次還原。
     */
    editor.chain().command(({ tr, state }) => {
      const { from, to } = selection;
      const link = state.schema.marks.link;
      const marks = state.doc.resolve(from).marks().filter(mark => mark.type !== link);
      let end = to;
      if (remove) {
        tr.removeMark(from, to, link);
      } else if (from !== to && state.doc.textBetween(from, to, "\n") === linkText) {
        tr.addMark(from, to, link.create({ href }));
      } else {
        tr.replaceWith(from, to, state.schema.text(linkText, [...marks, link.create({ href })]));
        end = from + linkText.length;
      }
      tr.setSelection(TextSelection.create(tr.doc, end));
      // 明確清除 stored link mark，讓插入後繼續輸入的文字不會沿用這個網址。
      tr.setStoredMarks(marks);
      return true;
    }).run();
    setLinkError("");
    closeLink();
  }

  useEffect(() => {
    if (mediaOpen) mediaInputRef.current?.focus({ preventScroll: true });
  }, [mediaOpen]);
  const selectedMedia = state?.media;
  function openMedia() {
    if (!editor) return;
    const node = editor.isActive("audioEmbed")
      ? { type: "audioEmbed", attrs: editor.getAttributes("audioEmbed") }
      : { type: "videoEmbed", attrs: editor.getAttributes("videoEmbed") };
    const projected = canonicalEditorContent(node);
    showMedia(isRichMediaNode(projected) ? projected : undefined);
  }
  function closeMedia() {
    setMediaOpen(false);
    // native Dialog 開啟時底層 editor 不可取得焦點；等關閉後再還原，避免整頁跳動或遺失選取位置。
    requestAnimationFrame(() =>
      editor?.commands.focus(undefined, { scrollIntoView: false }),
    );
  }
  function applyMedia() {
    if (!editor || disabled) return;
    try {
      const node = resolveMediaInput(mediaUrl, mediaKind);
      // 選到媒體 atom 時替換該節點；否則插入在保留的游標位置。
      editor.chain().insertContent(node).run();
      closeMedia();
    } catch (error) {
      setMediaError(
        error instanceof Error ? error.message : "請確認媒體網址。",
      );
    }
  }

  function resetImageForm() {
    setImageFile(null);
    setImageFileSource("picker");
    setImageAlt("");
    setImageCaption("");
    setImageDecorative(false);
    setImageError("");
    if (imageFileRef.current) imageFileRef.current.value = "";
  }

  function openImage() {
    if (!editor || disabled) return;
    const existing = editor.isActive("image")
      ? canonicalEditorContent({
          type: "image",
          attrs: editor.getAttributes("image"),
        }) as RichImageNode
      : null;
    const position = editor.state.selection.from;
    if (!existing) {
      showImageInsert(position);
      return;
    }
    setImageTarget({ position, existing });
    setImageFile(null);
    setImageFileSource("picker");
    setImageAlt(existing?.attrs.alt ?? "");
    setImageCaption(existing?.attrs.caption ?? "");
    setImageDecorative(existing?.attrs.alt === "");
    setImageError("");
    setImageOpen(true);
  }

  function closeImage() {
    if (imagePending) return;
    setImageOpen(false);
    setImageTarget(null);
    resetImageForm();
    requestAnimationFrame(() => {
      if (!editor || editor.isDestroyed) return;
      editor.commands.focus(undefined, { scrollIntoView: false });
    });
  }

  function validateImageForm(): string | null {
    if (!imageTarget?.existing) {
      if (!imageFile) return "請選擇一張圖片。";
      const fileError = validateImageFile(imageFile);
      if (fileError) return fileError;
    }
    if (!imageDecorative && !imageAlt.trim()) {
      return "請輸入圖片說明，或將圖片標示為裝飾。";
    }
    if (Array.from(imageAlt.trim()).length > 300) return "圖片說明不得超過 300 字。";
    if (Array.from(imageCaption.trim()).length > 500) return "圖片標題不得超過 500 字。";
    return null;
  }

  async function applyImage() {
    if (!editor || disabled || !imageTarget || imagePending) return;
    const validationError = validateImageForm();
    if (validationError) {
      setImageError(validationError);
      return;
    }
    setImageError("");
    setImagePending(true);
    try {
      let src = imageTarget.existing?.attrs.src;
      if (!src) {
        const formData = new FormData();
        formData.append("file", imageFile!);
        const response = await fetch("/api/admin/rich-content/images", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json().catch(() => null) as
          | { data?: { src?: unknown }; message?: unknown }
          | null;
        if (!response.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "圖片上傳失敗，請稍後再試。",
          );
        }
        if (
          typeof payload?.data?.src !== "string" ||
          !isCanonicalRichContentImageUrl(payload.data.src)
        ) throw new Error("圖片服務回傳了無效的網址，請稍後再試。");
        src = payload.data.src;
      }
      const node: RichImageNode = {
        type: "image",
        attrs: {
          src,
          alt: imageDecorative ? "" : imageAlt.trim(),
          caption: imageCaption.trim() || null,
        },
      };
      const { position, existing } = imageTarget;
      if (existing && editor.state.doc.nodeAt(position)?.type.name === "image") {
        editor.chain().command(({ tr }) => {
          tr.setNodeMarkup(position, undefined, node.attrs);
          return true;
        }).run();
      } else {
        const safePosition = Math.min(
          Math.max(position, 0),
          editor.state.doc.content.size,
        );
        const inserted = editor.commands.insertContentAt(safePosition, node);
        if (!inserted) editor.commands.insertContentAt(editor.state.doc.content.size, node);
      }
      setImagePending(false);
      setImageOpen(false);
      setImageTarget(null);
      resetImageForm();
      requestAnimationFrame(() => {
        if (editor.isDestroyed) return;
        editor.commands.focus(undefined, { scrollIntoView: false });
      });
    } catch (error) {
      setImagePending(false);
      setImageError(
        error instanceof Error ? error.message : "圖片上傳失敗，請稍後再試。",
      );
    }
  }
  const actions = [
    {
      group: "復原與重做",
      label: "復原",
      Icon: Undo2,
      enabled: state?.undo,
      run: () =>
        editor
          ?.chain()
          .focus(undefined, { scrollIntoView: false })
          .undo()
          .run(),
    },
    {
      group: "復原與重做",
      label: "重做",
      Icon: Redo2,
      enabled: state?.redo,
      run: () =>
        editor
          ?.chain()
          .focus(undefined, { scrollIntoView: false })
          .redo()
          .run(),
    },
    {
      group: "文字樣式",
      label: "粗體",
      Icon: Bold,
      pressed: state?.bold,
      run: () =>
        editor
          ?.chain()
          .focus(undefined, { scrollIntoView: false })
          .toggleBold()
          .run(),
    },
    {
      group: "文字樣式",
      label: "斜體",
      Icon: Italic,
      pressed: state?.italic,
      run: () =>
        editor
          ?.chain()
          .focus(undefined, { scrollIntoView: false })
          .toggleItalic()
          .run(),
    },
    {
      group: "清單",
      label: "項目符號清單",
      Icon: List,
      pressed: state?.bullet,
      run: () =>
        editor
          ?.chain()
          .focus(undefined, { scrollIntoView: false })
          .toggleBulletList()
          .run(),
    },
    {
      group: "清單",
      label: "編號清單",
      Icon: ListOrdered,
      pressed: state?.ordered,
      run: () =>
        editor
          ?.chain()
          .focus(undefined, { scrollIntoView: false })
          .toggleOrderedList()
          .run(),
    },
    {
      group: "引言與插入",
      label: "引言",
      Icon: Quote,
      pressed: state?.quote,
      run: () =>
        editor
          ?.chain()
          .focus(undefined, { scrollIntoView: false })
          .toggleBlockquote()
          .run(),
    },
    {
      group: "引言與插入",
      label: "新增或編輯連結",
      Icon: Link2,
      pressed: state?.link,
      run: openLink,
    },
    {
      group: "媒體",
      label: "新增或編輯媒體",
      Icon: Film,
      pressed: !!selectedMedia,
      run: openMedia,
    },
    {
      group: "媒體",
      label: state?.image ? "編輯圖片" : "插入圖片",
      Icon: ImageIcon,
      pressed: !!state?.image,
      run: openImage,
    },
    {
      group: "引言與插入",
      label: "分隔線",
      Icon: Minus,
      run: () =>
        editor
          ?.chain()
          .focus(undefined, { scrollIntoView: false })
          .setHorizontalRule()
          .run(),
    },
  ];

  const renderGroup = (group: string) => (
    <div
      key={group}
      role="group"
      aria-label={group}
      className="flex max-w-full items-center gap-0.5"
    >
      {actions
        .filter((action) => action.group === group)
        .map(({ label, Icon, run, pressed, enabled }) => (
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
              // 滑鼠按下工具列時阻止焦點轉移，避免原本文字 selection 被收起。
              // 鍵盤仍可觸發 onClick；指令會還原 editor 焦點。
              if (event.button === 0) event.preventDefault();
            }}
            onClick={run}
          >
            <Icon aria-hidden="true" className="size-4" />
          </Button>
        ))}
    </div>
  );

  return (
    <div
      className="rich-editor min-w-0 max-w-full rounded-xl border border-(--border-default) bg-(--surface-default)"
      data-empty={state?.empty ?? true}
    >
      <div
        role="group"
        aria-label="內容格式"
        className="rich-editor-toolbar min-w-0 rounded-t-xl border-b border-(--border-muted) p-2"
      >
        <Select
          aria-label="段落層級"
          value={state?.heading ?? "paragraph"}
          disabled={disabled || !editor}
          className="rich-editor-heading w-auto max-w-full text-sm"
          onChange={(event) => {
            const level = event.target.value;
            if (level === "paragraph")
              editor
                ?.chain()
                .focus(undefined, { scrollIntoView: false })
                .setParagraph()
                .run();
            else
              editor
                ?.chain()
                .focus(undefined, { scrollIntoView: false })
                .setHeading({
                  level: level === "2" ? 2 : level === "3" ? 3 : 4,
                })
                .run();
          }}
        >
          <option value="paragraph">內文</option>
          <option value="2">H2 標題</option>
          <option value="3">H3 標題</option>
          <option value="4">H4 標題</option>
        </Select>
        {renderGroup("復原與重做")}
        <div className="rich-editor-tools">
          {["文字樣式", "清單", "引言與插入", "媒體"].map(renderGroup)}
        </div>
      </div>
      <Modal
        open={mediaOpen}
        onClose={closeMedia}
        title={selectedMedia ? "編輯媒體" : "插入媒體"}
        size="sm"
        contentClassName="max-h-[60dvh]"
        closeDisabled={disabled}
      >
        <div className="space-y-3">
          <label htmlFor={id + "-media-kind"} className="text-sm font-medium">
            媒體
          </label>
          <Select
            id={id + "-media-kind"}
            value={mediaKind}
            disabled={disabled}
            onChange={(event) => setMediaKind(event.target.value as MediaKind)}
          >
            <option value="auto">自動辨識</option>
            <option value="youtube">YouTube</option>
            <option value="bilibili">Bilibili</option>
            <option value="video">直接影片檔</option>
            <option value="audio">直接音訊檔</option>
          </Select>
          <label
            htmlFor={id + "-media-url"}
            className="block text-sm font-medium"
          >
            媒體網址或嵌入碼<RequiredIndicator />
          </label>
          <Textarea
            ref={mediaInputRef}
            id={id + "-media-url"}
            rows={3}
            value={mediaUrl}
            aria-required="true"
            disabled={disabled}
            placeholder="https://… 或官方 iframe 嵌入碼"
            aria-invalid={!!mediaError}
            aria-describedby={
              id + "-media-help" + (mediaError ? " " + id + "-media-error" : "")
            }
            onChange={(event) => setMediaUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                applyMedia();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closeMedia();
              }
            }}
          />
          <p
            id={id + "-media-help"}
            className="text-xs leading-5 text-(--text-muted)"
          >
            可貼上 YouTube／Bilibili 分享網址或官方 iframe
            嵌入碼，或直接影片／音訊檔網址。
          </p>
          {mediaError ? (
            <p
              id={id + "-media-error"}
              role="alert"
              className="text-sm text-(--status-danger)"
            >
              {mediaError}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={closeMedia}
            >
              取消
            </Button>
            <Button size="sm" onClick={applyMedia} disabled={disabled}>
              {selectedMedia ? "更新媒體" : "插入媒體"}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={imageOpen}
        onClose={closeImage}
        title={imageTarget?.existing ? "編輯圖片" : "插入圖片"}
        size="sm"
        contentClassName="max-h-[70dvh]"
        closeDisabled={imagePending}
      >
        <div className="space-y-5">
          {!imageTarget?.existing ? (
            <div className="space-y-1.5">
              <label htmlFor={id + "-image-file"} className="block text-sm font-medium">
                圖片<RequiredIndicator />
              </label>
              {imageFile ? (
                <div
                  role="group"
                  aria-label="已選擇圖片"
                  className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border border-(--border-default) bg-(--surface-subtle) px-3 py-2.5"
                >
                  <ImageIcon aria-hidden="true" className="size-5 shrink-0 text-(--text-muted)" />
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="wrap-anywhere text-sm font-semibold text-(--text-primary)">
                      {imageFileLabel(imageFile, imageFileSource)}
                    </p>
                    <p className="text-xs text-(--text-muted)">{formatFileSize(imageFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={imagePending}
                    aria-controls={id + "-image-file"}
                    onClick={() => imageFileRef.current?.click()}
                  >
                    更換圖片
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={imagePending}
                  aria-controls={id + "-image-file"}
                  aria-describedby={id + "-image-file-help"}
                  onClick={() => imageFileRef.current?.click()}
                >
                  選擇圖片
                </Button>
              )}
              <input
                ref={imageFileRef}
                id={id + "-image-file"}
                type="file"
                className="sr-only"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                disabled={imagePending}
                aria-required="true"
                aria-invalid={!!imageError && !imageFile}
                aria-describedby={id + "-image-file-help" + (imageError ? " " + id + "-image-error" : "")}
                onClick={(event) => {
                  event.currentTarget.value = "";
                }}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setImageFile(file);
                  setImageFileSource("picker");
                  setImageError(file ? validateImageFile(file) ?? "" : "");
                }}
              />
              {imageFile ? (
                <span role="status" aria-live="polite" className="sr-only">
                  已選擇圖片：{imageFileLabel(imageFile, imageFileSource)}，
                  {formatFileSize(imageFile.size)}
                </span>
              ) : null}
              <p id={id + "-image-file-help"} className="text-xs leading-5 text-(--text-muted)">
                JPEG、PNG、WebP，最大 4 MiB
              </p>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor={id + "-image-alt"} className="block text-sm font-medium">
              圖片說明（替代文字）
              {imageDecorative ? null : <RequiredIndicator />}
            </label>
            <Input
              id={id + "-image-alt"}
              value={imageAlt}
              maxLength={300}
              disabled={imagePending || imageDecorative}
              aria-required={!imageDecorative}
              aria-invalid={!!imageError && !imageDecorative && !imageAlt.trim()}
              aria-describedby={id + "-image-alt-help" + (imageError ? " " + id + "-image-error" : "")}
              placeholder="社員們一起遊玩桌遊"
              onChange={(event) => {
                setImageAlt(event.target.value);
                setImageError("");
              }}
            />
            <p id={id + "-image-alt-help"} className="text-xs leading-5 text-(--text-muted)">
              描述圖片中的重要內容，供無法看見圖片的使用者理解。
            </p>
            <label className="flex min-h-11 items-center gap-2 pt-1 text-sm">
              <input
                type="checkbox"
                checked={imageDecorative}
                disabled={imagePending}
                onChange={(event) => {
                  const decorative = event.target.checked;
                  setImageDecorative(decorative);
                  if (decorative) setImageAlt("");
                  setImageError("");
                }}
              />
              此圖片僅為裝飾，不需要替代文字
            </label>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={id + "-image-caption"} className="block text-sm font-medium">
              圖片標題（選填）
            </label>
            <Input
              id={id + "-image-caption"}
              value={imageCaption}
              maxLength={500}
              disabled={imagePending}
              placeholder="九月新生社課"
              onChange={(event) => {
                setImageCaption(event.target.value);
                setImageError("");
              }}
            />
          </div>
          {imageError ? (
            <p id={id + "-image-error"} role="alert" className="text-sm text-(--status-danger)">{imageError}</p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" disabled={imagePending} onClick={closeImage}>
              取消
            </Button>
            <Button size="sm" disabled={imagePending} onClick={applyImage}>
              {imagePending
                ? "上傳中…"
                : imageTarget?.existing
                  ? "儲存圖片設定"
                  : "上傳並插入"}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={linkOpen} onClose={closeLink} title={linkSelection?.existing ? "編輯連結" : "新增連結"} size="sm" contentClassName="max-h-[60dvh]" closeDisabled={disabled}>
        <div className="space-y-3">
          <label htmlFor={id + "-link-text"} className="block text-sm font-medium">顯示文字<RequiredIndicator /></label>
          <Input ref={linkTextRef} id={id + "-link-text"} value={linkText} disabled={disabled} aria-required="true" aria-invalid={!!textError} aria-describedby={textError ? id + "-link-text-error" : undefined} onChange={(event) => setLinkText(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); applyLink(); }
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeLink(); }
          }} />
          {textError ? <p id={id + "-link-text-error"} role="alert" className="text-sm text-(--status-danger)">{textError}</p> : null}
          <label htmlFor={id + "-link"} className="text-sm font-medium">連結網址<RequiredIndicator /></label>
          <Input ref={linkInputRef} id={id + "-link"} value={url} aria-required="true" type="url" placeholder="https://example.com" disabled={disabled} aria-invalid={!!linkError} aria-describedby={id + "-link-help" + (linkError ? " " + id + "-link-error" : "")} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); applyLink(); }
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeLink(); }
          }} />
          <p id={id + "-link-help"} className="text-xs text-(--text-muted)">使用完整的 http:// 或 https:// 網址。</p>
          {linkError ? <p id={id + "-link-error"} role="alert" className="text-sm text-(--status-danger)">{linkError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            {linkSelection?.existing ? <Button size="sm" variant="ghost" disabled={disabled} onClick={() => applyLink(true)}>移除連結</Button> : null}
            <Button size="sm" variant="outline" disabled={disabled} onClick={closeLink}>取消</Button>
            <Button size="sm" disabled={disabled || !linkSelection} onClick={() => applyLink()}>{linkSelection?.existing ? "儲存" : "加入連結"}</Button>
          </div>
        </div>
      </Modal>
      {editor ? (
        <EditorContent
          editor={editor}
          className="rich-editor-viewport min-w-0 max-w-full"
        />
      ) : (
        <p role="status" className="min-h-64 p-4 text-sm text-(--text-muted)">
          正在載入編輯器…
        </p>
      )}
    </div>
  );
}
