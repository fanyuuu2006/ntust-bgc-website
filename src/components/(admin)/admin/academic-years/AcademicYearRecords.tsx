"use client";

import { AcademicYearActions } from "./AcademicYearActions";
import { Badge } from "@/components/ui/Badge";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AcademicYear } from "@/types/database";
import { formatDate } from "@/utils/date";

export function AcademicYearRecords({ years, hasQuery = false }: { years: AcademicYear[]; hasQuery?: boolean }) {
  if (!years.length) {
    if (hasQuery) {
      return (
        <QueryEmptyState
          title="找不到符合條件的學年度"
          clearHref="/admin/academic-years"
        />
      );
    }

    return (
      <EmptyState
        title="目前沒有學年度資料"
        description="可新增第一個學年度。"
      />
    );
  }

  return (
    <div className="grid gap-2">
      {years.map((year) => (
        <Card
          key={year.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold">{year.year} 學年度</h2>
              {year.is_current ? <Badge tone="info">目前學年度</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-(--text-muted)">
              {formatDate(year.start_date)} 至 {formatDate(year.end_date)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
            <AcademicYearActions year={year} />
          </div>
        </Card>
      ))}
    </div>
  );
}
