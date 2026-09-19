import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { AdminReviewFilters } from "@/components/(admin)/admin/reviews/AdminReviewFilters";
import { AdminReviewRecords } from "@/components/(admin)/admin/reviews/AdminReviewRecords";
import { Pagination } from "@/components/Pagination/Pagination";
import { PaginationSummary } from "@/components/Pagination/PaginationSummary";
import { withServerErrorReference } from "@/libs/observability/server-render";
import { adminReviewsQuerySchema } from "@/services/reviews/reviews.schema";
import { adminReviewsService } from "@/services/reviews/admin-reviews.service";

async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = adminReviewsQuerySchema.parse(await searchParams);
  const [reviews, selectedBoardGame] = await Promise.all([
    adminReviewsService.list(query),
    adminReviewsService.getBoardGameFilter(query.boardGameId),
  ]);
  const filterQuery = {
    search: query.search,
    rating: query.rating,
    boardGameId: query.boardGameId,
    sort: query.sort,
    pageSize: query.pageSize,
  };

  return (
    <>
      <HeadingSection
        title="評價與評論管理"
        description="管理使用者留下的桌遊評價與文字評論。"
      />
      <section className="space-y-4 px-4 pb-6 sm:px-6 lg:px-8">
        <AdminReviewFilters query={filterQuery} selectedBoardGame={selectedBoardGame} />
        <PaginationSummary
          page={query.page}
          pageSize={query.pageSize}
          total={reviews.total}
          totalPages={reviews.totalPages}
        />
        <AdminReviewRecords
          reviews={reviews.data}
          query={filterQuery}
          hasQuery={Boolean(query.search || query.rating || query.boardGameId || query.page > 1)}
        />
        <Pagination
          className="p-4"
          page={query.page}
          pageSize={query.pageSize}
          total={reviews.total}
          totalPages={reviews.totalPages}
          basePath="/admin/reviews"
          pageSizeOptions={[10, 20, 50, 100]}
          query={filterQuery}
        />
      </section>
    </>
  );
}

export default withServerErrorReference(AdminReviewsPage, "/admin/reviews");
