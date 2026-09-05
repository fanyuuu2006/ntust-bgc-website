import { cn } from "@/utils/className";
import React from "react";

type FormFeedbackProps = React.HTMLAttributes<HTMLDivElement> & {
  error?: string | null;
  success?: string | null;
  warning?: string | null;
  info?: string | null;
};

/**
 * 統一表單提示訊息樣式。aria-live 容器一律渲染（不因無內容而卸載），
 * 確保訊息第一次出現時也能被螢幕閱讀器正確播報。
 */
export const FormFeedback = ({
  error,
  success,
  warning,
  info,
  className,
  ...props
}: FormFeedbackProps) => {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={cn("min-h-5", className)}
      {...props}
    >
      {error && (
        <p role="alert" className="text-sm text-(--status-danger)">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-(--status-success)">
          {success}
        </p>
      )}
      {warning && (
        <p role="status" className="text-sm text-(--status-warning)">
          {warning}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-(--status-info)">
          {info}
        </p>
      )}
    </div>
  );
};
