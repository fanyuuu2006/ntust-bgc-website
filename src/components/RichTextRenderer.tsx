import { Fragment, type ReactNode } from "react";
import {
  readRichContent,
  type RichBlock,
  type RichInline,
  type RichListItem,
  type StoredRichContent,
} from "@/libs/rich-content/content";
import { cn } from "@/utils/className";

// 只映射已驗證節點，由 React 跳脫文字；不將作者資料交給 HTML 執行入口，也不展開為任意 DOM attributes。
function renderNode(node: RichBlock | RichInline | RichListItem): ReactNode {
  if (node.type === "text") {
    return (node.marks ?? []).reduce<ReactNode>((child, mark) => {
      if (mark.type === "bold") return <strong>{child}</strong>;
      if (mark.type === "italic") return <em>{child}</em>;
      if (mark.type === "link") return <a href={mark.attrs.href}>{child}</a>;
      return child;
    }, node.text);
  }
  if (node.type === "hardBreak") return <br />;
  if (node.type === "horizontalRule") return <hr />;
  // 作者只能提供已驗證 ID／URL；iframe 來源與權限由 renderer 決定，不信任儲存的 HTML。原生播放器不自動播放。
  if (node.type === "videoEmbed") {
    if (node.attrs.provider !== "direct")
      return (
        <div className="rich-media-video">
          <iframe
            src={
              node.attrs.provider === "youtube"
                ? `https://www.youtube-nocookie.com/embed/${node.attrs.videoId}`
                : `https://player.bilibili.com/player.html?bvid=${node.attrs.videoId}&autoplay=0`
            }
            title={
              node.attrs.provider === "youtube"
                ? "YouTube 影片"
                : "Bilibili 影片"
            }
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow={
              node.attrs.provider === "youtube"
                ? "fullscreen; picture-in-picture; encrypted-media"
                : "fullscreen"
            }
            allowFullScreen
          />
        </div>
      );
    return (
      <video controls preload="metadata" src={node.attrs.src}>
        您的瀏覽器無法播放這段影片。<a href={node.attrs.src}>開啟影片</a>
      </video>
    );
  }
  if (node.type === "audioEmbed")
    return (
      <audio controls preload="metadata" src={node.attrs.src}>
        您的瀏覽器無法播放這段音訊。<a href={node.attrs.src}>開啟音訊</a>
      </audio>
    );
  if (node.type === "image")
    return (
      <figure className="rich-content-image">
        {/* Rich Content 圖片已由 canonical Storage URL validator 限制，不使用 Vercel image optimization。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={node.attrs.src}
          alt={node.attrs.alt}
          loading="lazy"
          decoding="async"
        />
        {node.attrs.caption ? <figcaption>{node.attrs.caption}</figcaption> : null}
      </figure>
    );
  const children = node.content?.map((child, index) => (
    <Fragment key={index}>{renderNode(child)}</Fragment>
  ));
  switch (node.type) {
    case "paragraph":
      return <p>{children?.length ? children : <br />}</p>;
    case "heading":
      return node.attrs.level === 2 ? (
        <h2>{children}</h2>
      ) : node.attrs.level === 3 ? (
        <h3>{children}</h3>
      ) : (
        <h4>{children}</h4>
      );
    case "bulletList":
      return <ul>{children}</ul>;
    case "orderedList":
      return <ol start={node.attrs?.start}>{children}</ol>;
    case "listItem":
      return <li>{children}</li>;
    case "blockquote":
      return <blockquote>{children}</blockquote>;
  }
}

/**
 * 公開頁面的 SSR Rich Content renderer；只輸出 React 語意元素，不載入 Tiptap runtime。
 * 未知版本或非法文件退回已跳脫的純文字 companion，避免整頁崩潰或把 legacy 文字當 HTML 執行。
 */
export function RichTextRenderer({
  className,
  ...value
}: StoredRichContent & { className?: string }) {
  const document = readRichContent(value);
  return (
    <div
      className={cn(
        "rich-content min-w-0 max-w-full wrap-anywhere",
        !document && "whitespace-pre-wrap",
        className,
      )}
    >
      {document
        ? document.content.map((node, index) => (
            <Fragment key={index}>{renderNode(node)}</Fragment>
          ))
        : value.content}
    </div>
  );
}
