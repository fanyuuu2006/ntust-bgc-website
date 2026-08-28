import { cn } from "@/utils/className";
import { Card } from "@/components/ui/Card";

type AuthCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
};

export const AuthCard = ({
  title,
  description,
  children,
  className,
  ...rest
}: AuthCardProps) => {
  return (
    <Card
      className={cn(
        "p-6 sm:p-8",
        className,
      )}
      {...rest}
    >
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-bold text-(--text-primary) sm:text-2xl">
          {title}
        </h1>
        {description && <p className="text-sm text-(--text-muted)">{description}</p>}
      </div>

      {children}
    </Card>
  );
};
