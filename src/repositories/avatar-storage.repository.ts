import "server-only";

import { AVATAR_BUCKET } from "@/libs/avatar/image";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";

export const avatarStorageRepository = {
  upload: async (
    objectPath: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> => {
    const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(
      objectPath,
      bytes,
      { contentType, cacheControl: "31536000", upsert: false },
    );
    if (error) throwRepositoryError("上傳使用者頭像失敗", error);
  },

  remove: async (objectPath: string): Promise<void> => {
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([
      objectPath,
    ]);
    if (error) throwRepositoryError("刪除使用者頭像失敗", error);
  },
};
