import { reportUnexpectedError } from "@/libs/observability/report";
import "server-only";

import { cache } from "react";

import { getCurrentUser, isAdminByUserId } from "@/libs/auth";
import { RepositoryError } from "@/repositories/shared/errors";
import type { User } from "@/types/database";

export type PublicViewerResolution =
  | {
      status: "resolved";
      user: User | null;
      isAdmin: boolean;
    }
  | {
      status: "unavailable";
      user: null;
      isAdmin: false;
    };

export const resolvePublicViewer = cache(
  async (): Promise<PublicViewerResolution> => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        return { status: "resolved", user: null, isAdmin: false };
      }

      const isAdmin = await isAdminByUserId(user.id);
      return { status: "resolved", user, isAdmin };
    } catch (error) {
      if (!(error instanceof RepositoryError)) {
        throw error;
      }

      reportUnexpectedError(error, { context: "public.viewer" });
      return { status: "unavailable", user: null, isAdmin: false };
    }
  },
);
