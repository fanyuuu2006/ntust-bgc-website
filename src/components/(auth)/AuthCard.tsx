import { cn } from "@/utils/className";

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
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border border-(--border) bg-(--primary-background) p-6 sm:p-8",
        className,
      )}
      {...rest}
    >
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-bold text-(--foreground) sm:text-2xl">
          {title}
        </h1>
        {description && <p className="text-sm text-(--muted)">{description}</p>}
      </div>

      {children}
    </div>
  );
};
