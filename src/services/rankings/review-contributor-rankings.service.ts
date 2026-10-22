import "server-only";

import { z } from "zod";

import { reviewContributorRankingsRepository } from "@/repositories/review-contributor-rankings.repository";
import { toPublicUserIdentity } from "@/services/users/public-identity";
import type { ReviewContributorRankingsPage } from "./review-contributor-rankings.types";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(50).catch(20),
});

export const reviewContributorRankingsService = {
  list: async (input: unknown = {}): Promise<ReviewContributorRankingsPage> => {
    const options = querySchema.parse(input);
    const result = await reviewContributorRankingsRepository.findPage(options);
    return {
      ...result,
      data: result.data.map((item) => ({
        globalRank: Number(item.global_rank),
        user: toPublicUserIdentity({
          id: item.user_id,
          name: item.user_name,
          avatar: item.user_avatar,
          closed_at: null,
        }),
        reviewCount: Number(item.review_count),
        receivedLikeCount: Number(item.received_like_count),
      })),
    };
  },
};
