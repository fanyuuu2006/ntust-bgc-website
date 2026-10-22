import type { BoardGameRanking } from "@/repositories/board-game-statistics.repository";

export const BOARD_GAME_RANKINGS: ReadonlyArray<{
  key: BoardGameRanking;
  label: string;
  description: string;
}> = [
  { key: "popular", label: "綜合排行", description: "綜合借用熱度、評分品質與評分參與度排名。" },
  { key: "rating", label: "桌遊評分排行", description: "綜合平均評分與評分人數計算排名，避免少量高分讓結果失真。" },
  { key: "reviews", label: "桌遊評論排行", description: "依公開且包含文字內容的評論數排名。" },
  { key: "borrowed", label: "桌遊借用排行", description: "依已借出或已歸還的累計借用次數排名。" },
];

export const BOARD_GAME_RANKING_PAGE_SIZE = 20;

export function getBoardGameRanking(key: string | undefined) {
  return BOARD_GAME_RANKINGS.find((ranking) => ranking.key === key) ?? BOARD_GAME_RANKINGS[0];
}
