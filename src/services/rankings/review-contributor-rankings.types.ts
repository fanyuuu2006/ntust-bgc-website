export type ReviewContributorRankingItem = Readonly<{
  globalRank: number;
  user: Readonly<{ id: string; name: string; avatar: string | null }>;
  reviewCount: number;
  receivedLikeCount: number;
}>;

export type ReviewContributorRankingsPage = Readonly<{
  data: ReviewContributorRankingItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;
