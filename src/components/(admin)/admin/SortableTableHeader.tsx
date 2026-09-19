import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/utils/className";
import { buildQueryString } from "@/utils/url";
import type { QueryValue } from "@/utils/url";

type Query = Record<string, QueryValue>;
type Props = {
  label: string;
  column: string;
  basePath: string;
  query: Query;
  className?: string;
  sortValues?: { asc: string; desc: string };
};

export function SortableTableHeader({
  label,
  column,
  basePath,
  query,
  className,
  sortValues,
}: Props) {
  const mappedDirection = sortValues
    ? query.sort === sortValues.asc
      ? "asc"
      : query.sort === sortValues.desc
        ? "desc"
        : null
    : null;
  const active = sortValues ? mappedDirection !== null : query.orderBy === column;
  const direction = sortValues ? mappedDirection : query.orderDirection;
  const nextDirection = active && direction === "asc" ? "desc" : "asc";
  const nextQuery = sortValues
    ? { sort: sortValues[nextDirection], page: "1" }
    : { orderBy: column, orderDirection: nextDirection, page: "1" };
  const href = `${basePath}?${buildQueryString(query, nextQuery)}`;
  const Icon = active ? direction === "asc" ? ArrowUp : ArrowDown : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 py-3 text-xs font-semibold", className)}
    >
      <Link
        href={href}
        className="inline-flex items-center gap-1 whitespace-nowrap transition hover:text-(--foreground)"
      >
        <span>{label}</span>
        <Icon aria-hidden="true" className="size-3.5 text-(--muted)" />
      </Link>
    </th>
  );
}
