import { cn } from "@/utils/className";

type HeadingSectionProps = React.HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
};

export const HeadingSection = ({
  title,
  description,
  className,
  ...rest
}: HeadingSectionProps) => {
  return (
    <section {...rest} className={cn("flex flex-col gap-1 p-4", className)}>
      <h1 className="text-xl text-(--foreground font-bold sm:text-2xl">{title}</h1>
      {description && <p className="text-sm text-(--muted)">{description}</p>}
    </section>
  );
};
