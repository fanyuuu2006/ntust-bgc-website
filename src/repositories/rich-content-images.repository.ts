import "server-only";

import { supabase } from "@/libs/supabase/server";
import { RICH_CONTENT_IMAGE_BUCKET } from "@/libs/rich-content/image";
import { throwRepositoryError } from "@/repositories/shared/errors";

export const richContentImagesRepository = {
  upload: async (
    objectPath: string,
    bytes: Uint8Array,
    contentType: string,
  ): Promise<void> => {
    const { error } = await supabase.storage
      .from(RICH_CONTENT_IMAGE_BUCKET)
      .upload(objectPath, bytes, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) throwRepositoryError("上傳 Rich Content 圖片失敗", error);
  },
};
