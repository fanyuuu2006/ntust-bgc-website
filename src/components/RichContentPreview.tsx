"use client";

import { Component, useState, type ReactNode } from "react";
import { Eye } from "lucide-react";
import { Modal } from "@/components/Modal";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { ErrorReference } from "@/components/ErrorReference";
import { Button } from "@/components/ui/Button";
import { plainTextFromRichContent, richDocumentSchema } from "@/libs/rich-content/content";
import { reportUnexpectedError } from "@/libs/observability/report";

const failureMessage = "目前無法預覽這份內容。請關閉預覽後檢查內容，或稍後再試。";

// 預覽失敗不能卸載整張表單或丟失未儲存內容。每次開啟重建此 boundary；一般格式驗證失敗不回報 incident。
class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean; errorId?: string }> {
  state: { failed: boolean; errorId?: string } = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) {
    this.setState({ errorId: reportUnexpectedError(error, { context: "rich-content.preview" }) });
  }
  render() {
    return this.state.failed ? <div>
      <p role="alert" className="text-sm text-(--text-muted)">{failureMessage}</p>
      {this.state.errorId ? <ErrorReference errorId={this.state.errorId} /> : null}
    </div> : this.props.children;
  }
}

function PreviewContent({ value }: { value: unknown }) {
  const parsed = richDocumentSchema.safeParse(value);
  if (!parsed.success) return <p role="alert" className="text-sm text-(--text-muted)">{failureMessage}</p>;
  const content = plainTextFromRichContent(parsed.data);
  if (!content.replace(/[\s\u200b-\u200d\ufeff]/gu, "")) return <p className="text-sm text-(--text-muted)">目前沒有可預覽的內容。</p>;
  return <RichTextRenderer content_format="rich_text_v1" rich_content={parsed.data} content={content} />;
}

/**
 * 用公開頁面同一個 renderer 預覽目前未儲存的表單 JSON，不持久化、不依賴 Tiptap。
 * 關閉時卸載播放器以停止第三方載入／播放；editor 持續掛載，保留自己的 selection 與文件 state。
 */
export function RichContentPreview({ value, title, label }: { value: unknown; title: string; label: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={label} className="shrink-0">
      <Eye aria-hidden="true" className="size-4" />預覽
    </Button>
    <Modal open={open} onClose={() => setOpen(false)} title={label} size="lg" contentClassName="max-h-[70dvh] p-3 sm:p-5">
      {open ? <PreviewBoundary>
        <article className="min-w-0 max-w-full space-y-5">
          {title.trim() ? <h1 className="wrap-anywhere text-xl font-bold sm:text-2xl">{title}</h1> : null}
          <PreviewContent value={value} />
        </article>
      </PreviewBoundary> : null}
    </Modal>
  </>;
}
