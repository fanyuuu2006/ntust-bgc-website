import { withServerErrorReference } from "@/libs/observability/server-render";
import { getAdminReturnPath } from "@/utils/admin-return";
import { ButtonLink } from "@/components/ui/Button";
import { notFound } from "next/navigation";
import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { BoardGameForm } from "@/components/(admin)/admin/board-games/BoardGameForm";
import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { boardGamesService } from "@/services/board-games/board-games.service";

type BoardGameEditPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

async function BoardGameEditPage({
  params,
  searchParams,
}: BoardGameEditPageProps) {
  const { id } = await params;
  const returnTo = getAdminReturnPath((await searchParams).returnTo, "/admin/board-games");

  let boardGame;

  try {
    boardGame = await boardGamesService.getBoardGameById(id);
  } catch (error) {
    if (error instanceof BoardNotFoundError) {
      notFound();
    }
    throw error;
  }

  const [categories, locations] = await Promise.all([
    boardGamesService.listCategories(),
    boardGamesService.listLocations(),
  ]);

  return (
    <>
      <HeadingSection
        title="編輯桌遊"
        description={`更新「${boardGame.name}」的基本與管理資訊。`}
        actions={
          <ButtonLink href={returnTo} variant="outline">
            返回列表
          </ButtonLink>
        }
      />

      <section className="mx-auto w-full max-w-3xl px-4 pb-8 sm:px-6 lg:px-8">
        <BoardGameForm
          returnTo={returnTo}
          mode="edit"
          boardGameId={id}
          categories={categories}
          locations={locations}
          initialValues={{
            name: boardGame.name,
            inventory_number: String(boardGame.inventory_number),
            description: boardGame.description ?? "",
            image: boardGame.image ?? "",
            category_id: boardGame.category_id,
            location_id: boardGame.location_id,
            status: boardGame.status,
          }}
        />
      </section>
    </>
  );
}

export default withServerErrorReference(BoardGameEditPage, "/admin/board-games/[id]/edit");
