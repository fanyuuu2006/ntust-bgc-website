import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { SortableTableHeader } from "@/components/(admin)/admin/SortableTableHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Pagination } from "@/components/Pagination/Pagination";
import { usersService } from "@/services/users/users.service";
import { formatAdminDateTime } from "@/utils/date";

type Props = { searchParams: Promise<{ search?: string; page?: string; pageSize?: string; orderBy?: string; orderDirection?: string }> };
const BASE_PATH = "/admin/users";
const SORT_FIELDS = ["name", "created_at", "updated_at"] as const;

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 20));
  const orderBy = SORT_FIELDS.includes(params.orderBy as (typeof SORT_FIELDS)[number]) ? params.orderBy as (typeof SORT_FIELDS)[number] : "created_at";
  const orderDirection = params.orderDirection === "asc" ? "asc" : "desc";
  const users = await usersService.listForAdmin({ page, pageSize, search: params.search?.trim() || undefined, orderBy, orderDirection });
  const query = { search: params.search, page: String(page), pageSize: String(pageSize), orderBy, orderDirection };
  return <><HeadingSection title="使用者管理" description="管理網站帳號與基本資料；社員資格與幹部職位在各自領域維護。" /><section className="space-y-4 px-4 pb-6"><form><AdminToolbar><Input name="search" defaultValue={params.search} placeholder="搜尋名稱或 Email" aria-label="搜尋使用者" className="min-w-0 flex-1" /><Button type="submit">搜尋</Button></AdminToolbar></form>{users.data.length === 0 ? <EmptyState title="沒有符合條件的使用者" description="請調整搜尋關鍵字後再試一次。" /> : <><div className="grid gap-3 lg:hidden">{users.data.map((user) => <Card key={user.id} className="space-y-3 p-4"><div><p className="font-semibold">{user.profile?.real_name || user.name}</p><p className="mt-1 text-sm text-(--text-muted)">{user.email}</p></div><dl className="grid grid-cols-2 gap-3 text-sm"><Info label="學號" value={user.profile?.student_id || "—"} /><Info label="系所／年級" value={[user.profile?.department, user.profile?.grade].filter(Boolean).join(" · ") || "—"} /><Info label="建立時間" value={formatAdminDateTime(user.created_at)} /></dl><ButtonLink href={`/admin/users/${user.id}`} variant="outline" size="sm">查看</ButtonLink></Card>)}</div><AdminListSection className="hidden lg:block"><Table><TableHeader><TableRow><SortableTableHeader label="使用者" column="name" basePath={BASE_PATH} query={query} /><TableHead>學號</TableHead><TableHead>系所／年級</TableHead><SortableTableHeader label="建立時間" column="created_at" basePath={BASE_PATH} query={query} /><SortableTableHeader label="更新時間" column="updated_at" basePath={BASE_PATH} query={query} /><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{users.data.map((user) => <TableRow key={user.id}><TableCell><p className="font-medium">{user.profile?.real_name || user.name}</p><p className="text-xs text-(--text-muted)">{user.email}</p></TableCell><TableCell>{user.profile?.student_id || "—"}</TableCell><TableCell>{[user.profile?.department, user.profile?.grade].filter(Boolean).join(" · ") || "—"}</TableCell><TableCell className="whitespace-nowrap">{formatAdminDateTime(user.created_at)}</TableCell><TableCell className="whitespace-nowrap">{formatAdminDateTime(user.updated_at)}</TableCell><TableCell className="text-right"><ButtonLink href={`/admin/users/${user.id}`} variant="outline" size="sm">查看</ButtonLink></TableCell></TableRow>)}</TableBody></Table></AdminListSection></>}<Pagination className="p-4" page={page} pageSize={pageSize} total={users.total} totalPages={users.totalPages} basePath={BASE_PATH} pageSizeOptions={[10, 20, 50, 100]} query={query} /></section></>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-(--text-muted)">{label}</dt><dd className="mt-0.5 break-words">{value}</dd></div>; }
