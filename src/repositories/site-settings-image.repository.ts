import "server-only";

import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";

export const siteSettingsImageRepository = {
  upload: async (objectPath: string, bytes: Uint8Array, contentType: string) => {
    const { error } = await supabase.storage.from("rich-content-images").upload(objectPath, bytes, {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throwRepositoryError("網站設定圖片上傳失敗", error);
  },
};
