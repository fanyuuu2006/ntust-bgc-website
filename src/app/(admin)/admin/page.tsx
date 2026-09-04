import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function AdminPage() {
  const [totalGames, pendingBorrowings, approvedBorrowings, borrowedGames] = await Promise.all([
    boardGamesService.countAllBoardGames(),
    boardGamesService.countBorrowingsByStatus("pending"),
    boardGamesService.countBorrowingsByStatus("approved"),
    boardGamesService.countBorrowingsByStatus("borrowed"),
  ]);

  return (
    <>
      <HeadingSection
        title="管理後台"
        description="優先處理借用流程與社團日常管理工作。"
        actions={<ButtonLink href="/admin/board-games/borrowings">桌遊借用管理</ButtonLink>}
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <h2 className="text-base font-semibold text-(--text-primary)">今日優先處理</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <OperationalSummary
            label="待處理借用申請"
            value={pendingBorrowings}
            description="確認是否核准新的借用申請。"
            href="/admin/board-games/borrowings?status=pending"
            action="查看申請"
          />
          <OperationalSummary
            label="已核准待借出"
            value={approvedBorrowings}
            description="確認現場交付桌遊與預計歸還時間。"
            href="/admin/board-games/borrowings?status=approved"
            action="確認借出"
          />
          <OperationalSummary
            label="借出中"
            value={borrowedGames}
            description="追蹤尚未歸還的桌遊。"
            href="/admin/board-games/borrowings?status=borrowed"
            action="查看借用"
          />
        </div>
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">桌遊社產</h2>
            <p className="mt-1 text-sm text-(--text-muted)">目前共 {totalGames} 款桌遊可供維護與查詢。</p>
          </div>
          <ButtonLink href="/admin/board-games" variant="outline" size="sm">前往桌遊管理</ButtonLink>
        </Card>
      </section>
    </>
  );
}

function OperationalSummary({
  label,
  value,
  description,
  href,
  action,
}: {
  label: string;
  value: number;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4">
      <div>
        <p className="text-sm text-(--text-muted)">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-(--text-primary)">{value}</p>
        <p className="mt-2 text-sm text-(--text-muted)">{description}</p>
      </div>
      <ButtonLink href={href} variant="outline" size="sm" className="self-start">{action}</ButtonLink>
    </Card>
  );
}
