import "server-only";

import { boardGameReviewsRepository } from "@/repositories/board-game-reviews.repository";
import { boardGamesRepository } from "@/repositories/board-games.repository";
import { userProfilesRepository } from "@/repositories/user-profiles.repository";
import { usersRepository } from "@/repositories/users.repository";
import { adminReviewsQuerySchema } from "./reviews.schema";
import type { ReviewRating } from "./reviews.types";

export const adminReviewsService = {
  list: async (input: unknown = {}) => {
    const query = adminReviewsQuerySchema.parse(input);
    const keyword = query.search;
    const [matchedUserIds, matchedProfileUserIds, matchedBoardGameIds] = keyword
      ? await Promise.all([
          usersRepository.findIdsBySearch(keyword),
          userProfilesRepository.findUserIdsBySearch(keyword),
          boardGamesRepository.findIdsBySearch(keyword),
        ])
      : [undefined, undefined, undefined];
    const identityIds = keyword
      ? [...new Set([...(matchedUserIds ?? []), ...(matchedProfileUserIds ?? [])])]
      : undefined;
    const result = await boardGameReviewsRepository.findAdminPage({
      ...query,
      matchedUserIds: identityIds,
      matchedBoardGameIds,
    });
    const userIds = [...new Set(result.data.map((review) => review.user_id))];
    const boardGameIds = [...new Set(result.data.map((review) => review.board_game_id))];
    const [users, profiles, boardGames] = await Promise.all([
      usersRepository.findManyByIds(userIds),
      userProfilesRepository.findManyByUserIds(userIds),
      boardGamesRepository.findManyByIds(boardGameIds),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    const profilesByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));
    const boardGamesById = new Map(boardGames.map((game) => [game.id, game]));
    return {
      ...result,
      data: result.data.flatMap((review) => {
        const author = usersById.get(review.user_id);
        const boardGame = boardGamesById.get(review.board_game_id);
        if (!author || !boardGame) return [];
        const profile = profilesByUserId.get(author.id);
        return [{
          id: review.id,
          rating: review.rating as ReviewRating,
          content: review.content,
          createdAt: review.created_at,
          updatedAt: review.updated_at,
          author: {
            id: author.id,
            name: author.name,
            email: author.email,
            closed_at: author.closed_at,
            real_name: profile?.real_name ?? null,
            student_id: profile?.student_id ?? null,
          },
          boardGame: { id: boardGame.id, name: boardGame.name },
        }];
      }),
    };
  },

  getBoardGameFilter: async (boardGameId: string | undefined) => {
    if (!boardGameId) return null;
    const game = await boardGamesRepository.findById(boardGameId);
    return game ? { id: game.id, name: game.name, inventoryNumber: game.inventory_number } : null;
  },
};
