import "server-only";
import { BOARD_GAME_IMAGES_BUCKET } from "@/libs/board-game-images/image";
import { supabase } from "@/libs/supabase/server";
import { throwRepositoryError } from "@/repositories/shared/errors";
export const boardGameImageStorageRepository={
  upload:async(objectPath:string,bytes:Uint8Array,contentType:string):Promise<void>=>{
    const {error}=await supabase.storage.from(BOARD_GAME_IMAGES_BUCKET).upload(objectPath,bytes,{contentType,cacheControl:"31536000",upsert:false});
    if(error)throwRepositoryError("上傳桌遊圖片失敗",error);
  },
  remove:async(objectPath:string):Promise<void>=>{const {error}=await supabase.storage.from(BOARD_GAME_IMAGES_BUCKET).remove([objectPath]);if(error)throwRepositoryError("刪除桌遊圖片失敗",error);},
};
