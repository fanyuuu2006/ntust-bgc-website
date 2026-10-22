"use client";

import { Info } from "lucide-react";

import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function RankingInfoDialog({ title = "排行說明", description = "以下是各項排行的計算方向。", children }: { title?: string; description?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="text"
        size="lg"
        onClick={() => setOpen(true)}
        className="shrink-0 px-1 text-(--interactive-primary)"
      >
        <Info aria-hidden="true" className="size-4" />
        排行說明
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        description={description}
        size="sm"
      >
        {children}
      </Modal>
    </>
  );
}
