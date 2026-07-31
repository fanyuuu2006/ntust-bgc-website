import { BoardGame, BoardGameBorrowing } from "@/types/database";

export type BoardGameBorrowingWithBoardGame = BoardGameBorrowing & {
  board_game: BoardGame | null;
};
