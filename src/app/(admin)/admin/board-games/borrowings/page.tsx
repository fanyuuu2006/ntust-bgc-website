import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminBorrowingList } from "@/components/(admin)/admin/borrowings/AdminBorrowingList";
import { Pagination } from "@/components/Pagination/Pagination";
import { listBorrowingsQuerySchema } from "@/services/board-games/board-games.schema";
import { boardGamesService } from "@/services/board-games/board-games.service";
const BASE_PATH = "/admin/board-games/borrowings";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function AdminBorrowingsPage({ searchParams }: Props) { const parsed = listBorrowingsQuerySchema.safeParse(await searchParams); const query = parsed.success ? parsed.data : {}; const page = query.page ?? 1; const pageSize = query.pageSize ?? 20; const borrowings = await boardGamesService.listBorrowings({ ...query, page, pageSize }); return <><HeadingSection title="桌遊借用管理" description="審核社員申請，完成借出與歸還，保留完整社產流向紀錄。" /><section className="space-y-4 px-4 pb-6"><AdminBorrowingList borrowings={borrowings.data} query={query} /><Pagination className="p-4" page={page} pageSize={pageSize} total={borrowings.total} totalPages={borrowings.totalPages} basePath={BASE_PATH} pageSizeOptions={[10, 20, 50, 100]} query={{ ...query, page }} /></section></>; }
