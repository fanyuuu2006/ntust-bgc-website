import { cn } from "@/utils/className";

type SettingsCardProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
};

export const SettingsCard = ({
  title,
  description,
  children,
  className,
  ...rest
}: SettingsCardProps) => (
  <div className={cn("card rounded-2xl flex flex-col gap-6 p-6", className)} {...rest}>
    <div className="flex flex-col gap-1">
      <h2 className="text-base font-semibold text-(--foreground)">{title}</h2>
      {description && <p className="text-sm text-(--muted)">{description}</p>}
    </div>
    {children}
  </div>
);
