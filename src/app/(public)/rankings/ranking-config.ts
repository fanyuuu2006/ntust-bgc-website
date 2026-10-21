import type { BoardGameRanking } from "@/repositories/board-game-statistics.repository";

export const BOARD_GAME_RANKINGS: ReadonlyArray<{
  key: BoardGameRanking;
  label: string;
  description: string;
}> = [
  { key: "popular", label: "綜合熱門", description: "綜合借用熱度、評分品質與評分參與度。" },
  { key: "rating", label: "最高評價", description: "綜合平均評分與評分人數，避免少量高分讓排名失真。" },
  { key: "reviews", label: "最多評論", description: "依公開且包含文字內容的評論數排名。" },
  { key: "borrowed", label: "最常借用", description: "依累計借用次數排名。" },
];

export const BOARD_GAME_RANKING_PAGE_SIZE = 20;

export function getBoardGameRanking(key: string | undefined) {
  return BOARD_GAME_RANKINGS.find((ranking) => ranking.key === key) ?? BOARD_GAME_RANKINGS[0];
}
