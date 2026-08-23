import {
  BoardGame,
  BoardGameBorrowing,
  BoardGameCategory,
  BoardGameLocation,
  User,
  UserProfile,
} from "@/types/database";

export type BoardGameBorrowingWithBoardGame = BoardGameBorrowing & {
  board_game: BoardGame;
};

export type BoardGameBorrowingForAdmin = BoardGameBorrowingWithBoardGame & {
  user: User;
  user_profile: UserProfile | null;
  approved_by_user: User | null;
};

export type BoardGameWithCategoryAndLocation = BoardGame & {
  category: BoardGameCategory;
  location: BoardGameLocation;
};
