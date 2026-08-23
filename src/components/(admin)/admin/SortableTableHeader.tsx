import Link from "next/link";
import { cn } from "@/utils/className";
import { buildQueryString } from "@/utils/url";

type Query = Record<string, string | string[] | undefined>;
type Props = { label: string; column: string; basePath: string; query: Query; className?: string };

export function SortableTableHeader({ label, column, basePath, query, className }: Props) {
  const active = query.orderBy === column;
  const nextDirection = active && query.orderDirection === "asc" ? "desc" : "asc";
  const href = `${basePath}?${buildQueryString(query, { orderBy: column, orderDirection: nextDirection, page: "1" })}`;
  return <th scope="col" aria-sort={active ? (query.orderDirection === "asc" ? "ascending" : "descending") : "none"} className={cn("px-4 py-3 text-xs font-semibold", className)}><Link href={href} className="inline-flex items-center gap-1 whitespace-nowrap transition hover:text-(--foreground)"><span>{label}</span><span aria-hidden="true" className="text-(--muted)">{active ? query.orderDirection === "asc" ? "↑" : "↓" : "↕"}</span></Link></th>;
}
