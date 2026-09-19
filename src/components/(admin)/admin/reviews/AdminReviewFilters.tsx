import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { PreservedQueryFields } from "@/components/query/PreservedQueryFields";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import type { ReviewSort } from "@/services/reviews/reviews.types";
import { AdminBoardGameFilter, type AdminBoardGameFilterValue } from "./AdminBoardGameFilter";

type Query = {
  search?: string;
  rating?: number;
  boardGameId?: string;
  sort: ReviewSort;
  pageSize: number;
};

export function AdminReviewFilters({
  query,
  selectedBoardGame,
}: {
  query: Query;
  selectedBoardGame: AdminBoardGameFilterValue | null;
}) {
  return (
    <AdminToolbar className="space-y-3">
      <form className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_8rem_10rem_auto]" aria-label="搜尋與篩選評價">
        <PreservedQueryFields query={query} ownedKeys={["search", "rating", "sort"]} />
        <ClearableSearchInput
          name="search"
          initialValue={query.search}
          clearHref="/admin/reviews"
          placeholder="搜尋評價、作者或桌遊"
          aria-label="搜尋評價"
          className="w-full"
        />
        <Select name="rating" defaultValue={query.rating ?? ""} aria-label="評分篩選" className="w-full">
          <option value="">全部評分</option>
          {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} 星</option>)}
        </Select>
        <Select name="sort" defaultValue={query.sort} aria-label="評價排序" className="w-full">
          <option value="newest">最新評價</option>
          <option value="oldest">最舊評價</option>
          <option value="highest">評分高至低</option>
          <option value="lowest">評分低至高</option>
        </Select>
        <Button type="submit" className="w-full lg:w-auto">套用</Button>
      </form>
      <AdminBoardGameFilter selected={selectedBoardGame} basePath="/admin/reviews" query={query} />
    </AdminToolbar>
  );
}
