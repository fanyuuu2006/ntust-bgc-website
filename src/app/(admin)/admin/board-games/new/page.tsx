import Link from "next/link";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { BoardGameForm } from "@/components/(admin)/admin/board-games/BoardGameForm";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function NewBoardGamePage() {
  const [categories, locations] = await Promise.all([
    boardGamesService.listCategories(),
    boardGamesService.listLocations(),
  ]);

  return (
    <>
      <HeadingSection
        title="新增桌遊"
        description="新增桌遊資料後，將立即出現在管理列表中"
        actions={
          <Link
            href="/admin/board-games"
            className="btn outline inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium"
          >
            返回列表
          </Link>
        }
      />

      <section className="px-4 pb-8">
        <BoardGameForm mode="create" categories={categories} locations={locations} />
      </section>
    </>
  );
}
