import type { BoardGameRanking } from "@/repositories/board-game-statistics.repository";

export const BOARD_GAME_RANKINGS: ReadonlyArray<{
  key: BoardGameRanking;
  label: string;
  description: string;
}> = [
  { key: "popular", label: "綜合排行", description: "探索社團裡受歡迎的桌遊！" },
  { key: "rating", label: "桌遊評分排行", description: "一起看看大家最推薦哪些桌遊！" },
  { key: "reviews", label: "桌遊評論排行", description: "看看哪些桌遊引起最多討論！" },
  { key: "borrowed", label: "桌遊借用排行", description: "看看哪些桌遊最常被借走！" },
];

export const BOARD_GAME_RANKING_PAGE_SIZE = 20;

export function getBoardGameRanking(key: string | undefined) {
  return BOARD_GAME_RANKINGS.find((ranking) => ranking.key === key) ?? BOARD_GAME_RANKINGS[0];
}
