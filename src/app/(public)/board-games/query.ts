import { z } from "zod";

import {
  readQueryValues,
  readSingleQueryValue,
  type QueryParamValue,
} from "@/libs/query-params";
import type { BoardGameStatus } from "@/types/database";
import {
  ALLOWED_STATUSES,
  normalizePageSize,
  SORT_OPTIONS,
} from "./constants";

export type PublicBoardGamesSearchParams = {
  [key: string]: QueryParamValue;
};

const uuidSchema = z.uuid();

export function normalizePublicBoardGamesQuery(
  params: PublicBoardGamesSearchParams,
) {
  const pageValue = Number(readSingleQueryValue(params.page));
  const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const pageSize = normalizePageSize(readSingleQueryValue(params.pageSize));
  const search = readSingleQueryValue(params.search);
  const statuses = readQueryValues(params.status).filter(
    (status): status is BoardGameStatus =>
      ALLOWED_STATUSES.includes(status as BoardGameStatus),
  );
  const categoryIds = readQueryValues(params.category).filter(
    (value) => uuidSchema.safeParse(value).success,
  );
  const locationIds = readQueryValues(params.location).filter(
    (value) => uuidSchema.safeParse(value).success,
  );
  const sort = readSingleQueryValue(params.sort);
  const orderBy = readSingleQueryValue(params.orderBy);
  const orderDirection = readSingleQueryValue(params.orderDirection);
  const sortOption =
    SORT_OPTIONS.find(
      (option) =>
        option.key === sort ||
        (option.orderBy === orderBy && option.orderDirection === orderDirection),
    ) ?? SORT_OPTIONS[0];

  return {
    page,
    pageSize,
    search,
    statuses,
    categoryIds,
    locationIds,
    sortOption,
  };
}
