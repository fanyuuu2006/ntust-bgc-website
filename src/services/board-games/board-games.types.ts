import {
  BoardGame,
  BoardGameBorrowing,
  BoardGameCategory,
  BoardGameLocation,
} from "@/types/database";

export type BoardGameBorrowingWithBoardGame = BoardGameBorrowing & {
  board_game: BoardGame;
};

export type BoardGameWithCategoryAndLocation = BoardGame & {
  category: BoardGameCategory;
  location: BoardGameLocation;
};
