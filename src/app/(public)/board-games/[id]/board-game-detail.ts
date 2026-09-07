import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";

import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { boardGamesService } from "@/services/board-games/board-games.service";

export const getBoardGameDetail = cache(async (rawId: string) => {
  const id = z.uuid().safeParse(rawId);
  if (!id.success) notFound();

  try {
    return await boardGamesService.getBoardGameWithCategoryAndLocation(id.data);
  } catch (error) {
    if (error instanceof BoardNotFoundError) notFound();
    throw error;
  }
});
