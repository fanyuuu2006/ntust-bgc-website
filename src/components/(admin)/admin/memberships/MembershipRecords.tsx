"use client";

import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import type { AdminMembership } from "@/services/memberships/memberships.types";
import type { AcademicYear } from "@/types/database";
import { formatAdminDateTime } from "@/utils/date";
import { MemberStatusBadge, MembershipTypeLabel } from "./MemberStatusBadge";
import { MembershipDeleteAction } from "./MembershipDeleteAction";
import { MembershipEditButton } from "./MembershipEditButton";

type Query = {
  orderBy?: "joined_at" | "created_at" | "status";
  orderDirection?: "asc" | "desc";
  search?: string;
  academic_year_id?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export function MembershipRecords({ memberships, years, query }: { memberships: AdminMembership[]; years: AcademicYear[]; query: Query }) {
  const headerQuery = Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]));
  if (!memberships.length) return <EmptyState title="目前沒有社員資格" description="可新增第一筆社員資格。" />;

  return <>
    <Card className="hidden overflow-x-auto p-0 lg:block">
      <Table className="min-w-[820px]"><TableHeader><TableRow>
        <TableHead>使用者</TableHead><TableHead>類型</TableHead><TableHead>學年度</TableHead>
        <SortableTableHeader label="狀態" column="status" basePath="/admin/memberships" query={headerQuery} />
        <SortableTableHeader label="加入時間" column="joined_at" basePath="/admin/memberships" query={headerQuery} />
        <SortableTableHeader label="建立時間" column="created_at" basePath="/admin/memberships" query={headerQuery} />
        <TableHead className="text-right">操作</TableHead>
      </TableRow></TableHeader><TableBody>{memberships.map((item) => <TableRow key={item.id}>
        <TableCell><p className="font-medium">{item.user_profile?.real_name || item.user.name}</p><p className="text-xs text-(--muted)">{item.user_profile?.student_id ?? item.user.email}</p></TableCell>
        <TableCell><MembershipTypeLabel type={item.type} /></TableCell>
        <TableCell>{item.academic_year?.year ?? "—"}</TableCell>
        <TableCell><MemberStatusBadge status={item.status} /></TableCell>
        <TableCell className="whitespace-nowrap">{formatAdminDateTime(item.joined_at)}</TableCell>
        <TableCell className="whitespace-nowrap">{formatAdminDateTime(item.created_at)}</TableCell>
        <TableCell className="text-right"><div className="flex flex-wrap justify-end gap-2"><MembershipEditButton membership={item} years={years} /><MembershipDeleteAction membershipId={item.id} /></div></TableCell>
      </TableRow>)}</TableBody></Table>
    </Card>
    <div className="grid gap-3 lg:hidden">{memberships.map((item) => <Card key={item.id} className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{item.user_profile?.real_name || item.user.name}</p><p className="text-xs text-(--muted)">{item.user_profile?.student_id ?? item.user.email}</p></div><span className="shrink-0"><MemberStatusBadge status={item.status} /></span></div>
      <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt>類型</dt><dd><MembershipTypeLabel type={item.type} /></dd></div><div><dt>學年度</dt><dd>{item.academic_year?.year ?? "—"}</dd></div><div><dt>加入時間</dt><dd>{formatAdminDateTime(item.joined_at)}</dd></div></dl>
      <div className="flex flex-wrap gap-2"><MembershipEditButton membership={item} years={years} /><MembershipDeleteAction membershipId={item.id} /></div>
    </Card>)}</div>
  </>;
}
