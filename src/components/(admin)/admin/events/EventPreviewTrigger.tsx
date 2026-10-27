"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function EventPreviewTrigger() {
  return <Button type="button" variant="outline" size="sm" className="shrink-0" aria-label="活動預覽" onClick={() => window.dispatchEvent(new CustomEvent("event-edit-preview"))}>
    <Eye aria-hidden="true" className="size-4" />活動預覽
  </Button>;
}
