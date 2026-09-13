import Link from "next/link";
import { ArrowRight, ClipboardCheck, ClockAlert, Handshake, PackageOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { PageHeader } from "@/components/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { cn } from "@/utils/className";

async function AdminPage() {
  const [totalGames, pendingBorrowings, approvedBorrowings, borrowedGames, overdueBorrowings] = await Promise.all([
    boardGamesService.countAllBoardGames(),
    boardGamesService.countBorrowingsByStatus("pending"),
    boardGamesService.countBorrowingsByStatus("approved"),
    boardGamesService.countBorrowingsByStatus("borrowed"),
    boardGamesService.countOverdueBorrowings(),
  ]);

  return (
    <section className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="管理總覽"
        description="查看目前需要處理的借用與社團狀況。"
      />
      <section aria-labelledby="borrowing-title">
        <h2 id="borrowing-title" className="text-base font-semibold">桌遊借用</h2>
        <p className="mt-1 mb-3 text-xs text-(--text-muted)">查看目前的借用申請、領取與歸還狀況。</p>
        <div className="grid gap-3 sm:grid-cols-3">
            <BorrowingStage
              icon={ClipboardCheck}
              accent="var(--status-warning)"
              label="待審核借用"
              description="新的桌遊借用申請"
              value={pendingBorrowings}
              href="/admin/board-games/borrowings?page=1&status=pending&orderBy=created_at&orderDirection=asc"
              action="查看申請"
            />
            <BorrowingStage
              icon={Handshake}
              accent="var(--interactive-primary)"
              label="等待領取"
              description="已核准，等待領取桌遊"
              value={approvedBorrowings}
              href="/admin/board-games/borrowings?page=1&status=approved&orderBy=created_at&orderDirection=asc"
              action="確認借出"
            />
            <BorrowingStage
              icon={PackageOpen}
              accent="var(--status-info)"
              label="借出中"
              description="目前尚未歸還的桌遊"
              value={borrowedGames}
              href="/admin/board-games/borrowings?page=1&status=borrowed&orderBy=due_at&orderDirection=asc"
              action="查看借用"
            />
          </div>
          <OverdueNotice
            value={overdueBorrowings}
            href="/admin/board-games/borrowings?page=1&status=borrowed&overdue=true&orderBy=due_at&orderDirection=asc"
          />
      </section>
      <section aria-labelledby="club-overview-title" className="space-y-2">
        <h2 id="club-overview-title" className="text-base font-semibold text-(--text-primary)">桌遊社產</h2>
        <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <p className="text-(--text-secondary)">目前共登錄 <strong className="mx-1 text-lg font-semibold tabular-nums text-(--text-primary)">{totalGames}</strong> 筆桌遊社產</p>
          <ButtonLink href="/admin/board-games" variant="text" size="sm">
            管理桌遊<ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
          </ButtonLink>
        </div>
      </section>
    </section>
  );
}

function BorrowingStage({ label, description, value, href, action, icon: Icon, accent }: {
  label: string;
  description: string;
  value: number;
  href: string;
  action: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <Card className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-xs font-medium text-(--text-secondary)">
          <Icon aria-hidden="true" className="size-4 shrink-0" style={{ color: accent }} />{label}
        </h3>
        <p className="mt-1 text-lg font-bold tabular-nums text-(--text-primary) sm:text-xl">
          {value}<span className="ml-1 text-xs font-medium text-(--text-secondary)">筆</span>
        </p>
      </div>
      <Link href={href} className="inline-flex min-h-10 items-center gap-1 rounded text-sm font-medium text-(--action) hover:text-(--action-hover) hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--interactive-primary)">
        {action}<ArrowRight aria-hidden="true" className="size-3.5 shrink-0" />
      </Link>
      <p className="w-full text-xs leading-5 text-(--text-muted)">{description}</p>
    </Card>
  );
}

function OverdueNotice({ value, href }: { value: number; href: string }) {
  return (
    <div className={cn("mt-4 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1", value > 0 && "text-(--status-warning)")}>
      <div className="min-w-0">
        <p className={cn("flex items-center gap-2 text-sm", value > 0 ? "font-semibold" : "text-(--text-muted)")}>
          <ClockAlert aria-hidden="true" className="size-4 shrink-0" /><span className="tabular-nums">{value > 0 ? `${value} 筆借用已逾期` : "目前沒有逾期借用"}</span>
        </p>
        <p className="mt-1 text-xs leading-5 text-(--text-muted)">
          {value > 0 ? "已有桌遊超過預計歸還時間。" : null}
        </p>
      </div>
      <ButtonLink href={href} variant="text" size="sm">
        查看逾期借用<ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
      </ButtonLink>
    </div>
  );
}

export default withServerErrorReference(AdminPage, "/admin");
