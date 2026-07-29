import { cn } from "@/utils/className";

type SettingsCardProps = React.HTMLAttributes<HTMLElement> & {
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
  <section
    className={cn("card rounded-2xl p-5 sm:p-6 lg:p-7", className)}
    {...rest}
  >
    <div className="border-b border-(--border) pb-4">
      <h2 className="text-lg font-bold text-(--foreground)">{title}</h2>
      {description && <p className="text-sm text-(--muted)">{description}</p>}
    </div>
    <div className="pt-5">{children}</div>
  </section>
);
