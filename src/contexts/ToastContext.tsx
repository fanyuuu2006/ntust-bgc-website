"use client";

import * as React from "react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/className";

type ToastTone = "success" | "error" | "warning" | "info";
type Toast = { id: number; tone: ToastTone; message: string };
type ToastContextValue = { showToast: (tone: ToastTone, message: string) => void };

// 允許元件在獨立測試或嵌入場景中安全渲染；正式頁面由 Root Layout 提供實際通知。
const ToastContext = createContext<ToastContextValue>({ showToast: () => undefined });
const toneClasses: Record<ToastTone, string> = {
  success: "border-(--status-success) text-(--status-success)",
  error: "border-(--status-danger) text-(--status-danger)",
  warning: "border-(--status-warning) text-(--status-warning)",
  info: "border-(--status-info) text-(--status-info)",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((tone: ToastTone, message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setToasts((current) => {
      if (current.some((item) => item.message === trimmed && item.tone === tone)) return current;
      return [...current.slice(-2), { id: Date.now() + Math.random(), tone, message: trimmed }];
    });
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = window.setTimeout(() => setToasts((current) => current.slice(1)), toasts[0].tone === "error" ? 7000 : 4000);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>
    {children}
    {toasts.length ? <div className="pointer-events-none fixed inset-x-3 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:w-96" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className={cn("pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-(--surface-default) px-4 py-3 text-sm shadow-(--shadow-card)", toneClasses[toast.tone])}>
        <p className="min-w-0 flex-1 wrap-anywhere leading-5">{toast.message}</p>
        <button type="button" aria-label="關閉通知" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="shrink-0 rounded-md p-1 text-(--text-muted) hover:bg-(--surface-subtle) hover:text-(--text-primary) focus-visible:outline-2 focus-visible:outline-(--focus-ring)"><X aria-hidden="true" className="size-4" /></button>
      </div>)}
    </div> : null}
  </ToastContext.Provider>;
}

export function useToast() {
  // 部分獨立元件測試會提供精簡 React mock；缺少 Context API 時採安全 no-op。
  try {
    return React.useContext(ToastContext);
  } catch {
    return { showToast: () => undefined };
  }
}
