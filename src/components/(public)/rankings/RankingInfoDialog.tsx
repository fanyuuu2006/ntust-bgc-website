"use client";

import { useState } from "react";
import { Info } from "lucide-react";

import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";

type RankingInfoDialogProps = {
  title?: string;
  description?: string;
  iconOnly?: boolean;
  children: React.ReactNode;
};

export function RankingInfoDialog({
  title = "排行說明",
  description = "以下是各項排行的計算方向。",
  iconOnly = false,
  children,
}: RankingInfoDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="text"
        size="lg"
        onClick={() => setOpen(true)}
        aria-label={iconOnly ? "排行說明" : undefined}
        title={iconOnly ? "排行說明" : undefined}
        className="shrink-0 px-2 text-(--interactive-primary)"
      >
        <Info aria-hidden="true" className="size-4" />
        {!iconOnly && "排行說明"}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description} size="sm">
        {children}
      </Modal>
    </>
  );
}
