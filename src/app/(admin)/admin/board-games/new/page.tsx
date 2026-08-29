import { ButtonLink } from "@/components/ui/Button";
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
          <ButtonLink href="/admin/board-games" variant="outline">
            返回列表
          </ButtonLink>
        }
      />

      <section className="px-4 pb-8">
        <BoardGameForm mode="create" categories={categories} locations={locations} />
      </section>
    </>
  );
}
