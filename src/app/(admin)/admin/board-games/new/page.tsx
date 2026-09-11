import { getAdminReturnPath } from "@/utils/admin-return";
import { ButtonLink } from "@/components/ui/Button";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { BoardGameForm } from "@/components/(admin)/admin/board-games/BoardGameForm";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function NewBoardGamePage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const returnTo = getAdminReturnPath((await searchParams).returnTo, "/admin/board-games");
  const [categories, locations, nextInventoryNumber] = await Promise.all([
    boardGamesService.listCategories(),
    boardGamesService.listLocations(),
    boardGamesService.getNextInventoryNumber(),
  ]);

  return (
    <>
      <HeadingSection
        title="新增桌遊"
        description="填寫桌遊、社產編號與存放資訊。"
        actions={
          <ButtonLink href={returnTo} variant="outline">
            返回列表
          </ButtonLink>
        }
      />

      <section className="mx-auto w-full max-w-3xl px-4 pb-8 sm:px-6 lg:px-8">
        <BoardGameForm returnTo={returnTo} initialValues={nextInventoryNumber === null ? undefined : { inventory_number: String(nextInventoryNumber) }} mode="create" categories={categories} locations={locations} />
      </section>
    </>
  );
}
