"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

export function CopyAction({ label, text }: { label: string; text: string }) {
  const [feedback, setFeedback] = useState("");
  const { showToast } = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("已複製");
      showToast("success", "已複製");
    } catch {
      setFeedback("無法複製，請手動選取文字。");
      showToast("error", "無法複製，請手動選取文字。");
    }
    timer.current = setTimeout(() => setFeedback(""), 2500);
  }
  return <>
    <Button type="button" variant="ghost" size="none" className="size-10 shrink-0 text-(--text-muted) sm:size-8" aria-label={feedback || label} title={feedback || label} onClick={copy}>
      {feedback === "已複製" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
    </Button>
    <span role="status" aria-live="polite" className="sr-only">{feedback}</span>
  </>;
}
