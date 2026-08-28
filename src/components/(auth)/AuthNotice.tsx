import { cn } from "@/utils/className";
import { Card } from "@/components/ui/Card";

type AuthNoticeProps = React.HTMLAttributes<HTMLDivElement>;

export const AuthNotice = ({ className, ...rest }: AuthNoticeProps) => {
  return (
    <Card
      role="note"
      surface="subtle"
      className={cn(
        "rounded-lg p-4 text-sm text-(--text-muted)",
        className,
      )}
      {...rest}
    >
      <p>網站帳號僅用於登入網站服務，並非已成為桌遊社社員。</p>
      <p className="mt-2">
        若需成為社員或使用其他服務，請依社團公告流程申請加入。
      </p>
    </Card>
  );
};
