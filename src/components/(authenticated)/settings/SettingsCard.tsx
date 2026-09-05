import { cn } from "@/utils/className";

type SettingsCardProps = React.HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
};

export const SettingsCard = ({
  title,
  description,
  icon,
  children,
  className,
  ...rest
}: SettingsCardProps) => (
  <section
    className={cn("card rounded-2xl p-4 sm:p-6", className)}
    {...rest}
  >
    <div className="flex min-w-0 items-start gap-3 border-b border-(--border-default) pb-4">
      {icon ? (
        <span className="mt-0.5 shrink-0 text-(--interactive-primary)">
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-(--text-primary)">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-(--text-muted)">
            {description}
          </p>
        ) : null}
      </div>
    </div>
    <div className="pt-4 sm:pt-5">{children}</div>
  </section>
);
