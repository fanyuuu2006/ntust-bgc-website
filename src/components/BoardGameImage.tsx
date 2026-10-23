"use client";

import type { BoardGame } from "@/types/database";
import { resolveMediaDisplayUrl } from "@/libs/media/media-url";
import { useState } from "react";
import { cn } from "@/utils/className";

type BoardGameImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  boardGame: Pick<BoardGame, "name" | "image">;
};

export function BoardGameImage({
  boardGame,
  alt,
  className,
  onError,
  referrerPolicy,
  ...rest
}: BoardGameImageProps) {
  const accessibleName = alt ?? boardGame.name;
  // 只在顯示層轉換目前環境的 Storage URL；資料庫原值與刪除流程維持不變。
  const displayUrl = resolveMediaDisplayUrl(boardGame.image);
  const [failedImage, setFailedImage] = useState<string | null>(null);

  if (!displayUrl || failedImage === boardGame.image) {
    return (
      <BoardGameImageFallback
        name={accessibleName}
        className={className}
        width={rest.width}
        height={rest.height}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displayUrl}
      alt={accessibleName}
      referrerPolicy={referrerPolicy ?? "no-referrer"}
      className={cn("shrink-0", className)}
      onError={(event) => {
        setFailedImage(boardGame.image);
        onError?.(event);
      }}
      {...rest}
    />
  );
}

type BoardGameImageFallbackProps = {
  name: string;
  className?: string;
  width?: React.ImgHTMLAttributes<HTMLImageElement>["width"];
  height?: React.ImgHTMLAttributes<HTMLImageElement>["height"];
};

function BoardGameImageFallback({
  name,
  className,
  width,
  height,
}: BoardGameImageFallbackProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={width}
      height={height}
      role="img"
      aria-label={`${name}尚無圖片`}
      className={cn(
        "shrink-0 bg-(--surface-subtle) text-(--text-muted)",
        className,
      )}
    >
      <rect
        x="24"
        y="24"
        width="52"
        height="52"
        rx="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        opacity="0.5"
      />
      <circle cx="38" cy="38" r="4" fill="currentColor" opacity="0.5" />
      <circle cx="62" cy="38" r="4" fill="currentColor" opacity="0.5" />
      <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.5" />
      <circle cx="38" cy="62" r="4" fill="currentColor" opacity="0.5" />
      <circle cx="62" cy="62" r="4" fill="currentColor" opacity="0.5" />
    </svg>
  );
}
