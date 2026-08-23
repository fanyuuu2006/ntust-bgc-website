import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { MasterDataManager } from "@/components/(admin)/admin/master-data/MasterDataManager";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function BoardGameCategoriesPage() {
  const categories = await boardGamesService.listCategories();
  const items = await Promise.all(
    categories.map(async (category) => ({
      ...category,
      count: await boardGamesService.countBoardGamesByCategoryId(category.id),
    })),
  );
  return (
    <>
      <HeadingSection
        title="桌遊種類管理"
        description="維護社產分類；仍有社產使用的種類不可刪除。"
      />
      <section className="px-4 pb-6">
        <MasterDataManager
          title="桌遊種類"
          singular="桌遊種類"
          endpoint="/api/admin/board-game-categories"
          items={items}
        />
      </section>
    </>
  );
}
