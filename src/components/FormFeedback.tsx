import { cn } from "@/utils/className";
import React from "react";

type FormFeedbackProps = React.HTMLAttributes<HTMLDivElement> & {
  error?: string | null;
  success?: string | null;
};

/**
 * 統一表單提示訊息樣式。aria-live 容器一律渲染（不因無內容而卸載），
 * 確保訊息第一次出現時也能被螢幕閱讀器正確播報。
 */
export const FormFeedback = ({
  error,
  success,
  className,
  ...props
}: FormFeedbackProps) => (
  <div aria-live="polite" className={cn(`min-h-5`, className)} {...props}>
    {error && (
      <p role="alert" className="text-sm text-(--game-red)">
        {error}
      </p>
    )}
    {success && (
      <p role="status" className="text-sm text-(--secondary)">
        {success}
      </p>
    )}
  </div>
);
