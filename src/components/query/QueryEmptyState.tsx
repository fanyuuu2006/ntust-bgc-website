import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

type QueryEmptyStateProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  title: string;
  description?: string;
  clearHref: string;
  clearLabel?: string;
};

export function QueryEmptyState({
  title,
  description,
  clearHref,
  clearLabel = "清除條件",
  ...props
}: QueryEmptyStateProps) {
  return (
    <EmptyState
      compact
      title={title}
      description={description}
      {...props}
      action={
        <ButtonLink href={clearHref} variant="outline" size="sm">
          {clearLabel}
        </ButtonLink>
      }
    />
  );
}
