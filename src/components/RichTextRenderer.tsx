import { Fragment, type ReactNode } from "react";
import { readRichContent, type RichBlock, type RichInline, type RichListItem, type StoredRichContent } from "@/libs/rich-content/content";
import { cn } from "@/utils/className";

// Only validated nodes reach this mapping. React escapes text; author data is
// never passed to an HTML sink or spread into DOM attributes.
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
  const children = node.content?.map((child, index) => <Fragment key={index}>{renderNode(child)}</Fragment>);
  switch (node.type) {
    case "paragraph": return <p>{children?.length ? children : <br />}</p>;
    case "heading": return node.attrs.level === 2 ? <h2>{children}</h2> : <h3>{children}</h3>;
    case "bulletList": return <ul>{children}</ul>;
    case "orderedList": return <ol start={node.attrs?.start}>{children}</ol>;
    case "listItem": return <li>{children}</li>;
    case "blockquote": return <blockquote>{children}</blockquote>;
  }
}

/**
 * SSR-compatible rendering without a Tiptap runtime or client hydration.
 * Unknown versions/invalid documents fall back to escaped companion text rather
 * than crashing the public page or interpreting legacy text as HTML.
 */
export function RichTextRenderer({ className, ...value }: StoredRichContent & { className?: string }) {
  const document = readRichContent(value);
  return <div className={cn("rich-content min-w-0 max-w-full wrap-anywhere [overflow-wrap:anywhere]", !document && "whitespace-pre-wrap", className)}>
    {document ? document.content.map((node, index) => <Fragment key={index}>{renderNode(node)}</Fragment>) : value.content}
  </div>;
}
