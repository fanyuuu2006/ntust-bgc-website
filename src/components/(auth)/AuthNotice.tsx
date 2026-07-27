import { cn } from "@/utils/className";

type AuthNoticeProps = React.HTMLAttributes<HTMLDivElement>;

export const AuthNotice = ({ className, ...rest }: AuthNoticeProps) => {
  return (
    <div
      role="note"
      className={cn(
        "rounded-lg border border-(--border) bg-(--secondary-background) p-4 text-sm text-(--muted)",
        className,
      )}
      {...rest}
    >
      <p>網站帳號僅用於登入網站服務，並非已成為桌遊社社員。</p>
      <p className="mt-2">
        若需成為社員或使用其他服務，請依社團公告流程申請加入。
      </p>
    </div>
  );
};
