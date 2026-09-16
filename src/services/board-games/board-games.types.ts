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

/** 個人借用列表與 Dashboard 只需要狀態、時間與桌遊識別，不載入介紹 JSON。 */
export type UserBorrowingListItem = Pick<BoardGameBorrowing, "id" | "status" | "created_at" | "approved_at" | "rejected_at" | "cancelled_at" | "borrowed_at" | "due_at" | "returned_at"> & {
  board_game: Pick<BoardGame, "id" | "name" | "inventory_number" | "image">;
};

export type BoardGameBorrowingForAdmin = BoardGameBorrowingWithBoardGame & {
  user: User;
  user_profile: UserProfile | null;
  approved_by_user: User | null;
  approved_by_user_profile: UserProfile | null;
  is_current_academic_year_member: boolean;
};

export type BoardGameWithCategoryAndLocation = BoardGame & {
  category: BoardGameCategory;
  location: BoardGameLocation;
};

export type BoardGameStats = {
  completedBorrowCount: number;
  averageRating: number | null;
  ratingCount: number;
  reviewCount: number;
};

export type BoardGameWithStats = BoardGame & {
  stats: BoardGameStats;
};

export type HomeBoardGameItem = Pick<BoardGame, "id" | "name" | "image" | "status"> & {
  category: Pick<BoardGameCategory, "name"> | null;
  location: Pick<BoardGameLocation, "name"> | null;
  stats: BoardGameStats;
};

export type BoardGameDiscoveryItem = HomeBoardGameItem & Pick<BoardGame, "inventory_number"> & {
  stats: BoardGameStats;
};
