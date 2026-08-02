import { HeadingSection } from "@/components/(admin)/HeadingSection";

type BoardGamesSearchParams = {
  page?: string;
  pageSize?: string;
  search?: string;
  orderBy?: string;
  orderDirection?: string;
};

type BoardGamesAdminPageProps = {
  searchParams: Promise<BoardGamesSearchParams>;
};

export default async function BoardGamesAdminPage({
  searchParams,
}: BoardGamesAdminPageProps) {
  return (
    <>
      <HeadingSection title="桌遊管理" description="管理社團桌遊的基本資料、分類、位置與借用狀態。" />
    </>
  );
}
