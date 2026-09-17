import { normalizeSupabaseOrigin } from "@/libs/rich-content/image";
import type { SupportedImageExtension } from "@/libs/images/file-signature";

export const BOARD_GAME_IMAGES_BUCKET = "board-game-images";
export const BOARD_GAME_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const OBJECT_PATH = new RegExp(`^(${UUID})/(${UUID_V4})\\.(jpg|png|webp)$`, "u");

export function createBoardGameImageObjectPath(boardGameId:string, extension:SupportedImageExtension, randomId=crypto.randomUUID()):string {
  const path=`${boardGameId}/${randomId}.${extension}`;
  if(!OBJECT_PATH.test(path)) throw new Error("桌遊圖片物件路徑無效");
  return path;
}
export function buildBoardGameImagePublicUrl(objectPath:string, configuredOrigin=process.env.SUPABASE_URL):string {
  const origin=normalizeSupabaseOrigin(configuredOrigin);
  if(!origin||!OBJECT_PATH.test(objectPath)) throw new Error("桌遊圖片 Storage 設定無效");
  return `${origin}/storage/v1/object/public/${BOARD_GAME_IMAGES_BUCKET}/${objectPath}`;
}
export function parseOwnedBoardGameImageUrl(value:string, expectedBoardGameId:string, configuredOrigin=process.env.SUPABASE_URL):{objectPath:string;extension:SupportedImageExtension}|null {
  if(value.length>2048||/[\s\u0000-\u001f\u007f<>"'\\]/u.test(value)) return null;
  const origin=normalizeSupabaseOrigin(configuredOrigin); if(!origin)return null;
  try { const url=new URL(value);
    if(url.protocol!=="https:"||url.origin!==origin||url.username||url.password||url.search||url.hash)return null;
    const prefix=`/storage/v1/object/public/${BOARD_GAME_IMAGES_BUCKET}/`;
    if(!url.pathname.startsWith(prefix))return null;
    const objectPath=url.pathname.slice(prefix.length); const match=OBJECT_PATH.exec(objectPath);
    if(!match||match[1]!==expectedBoardGameId)return null;
    const extension=match[3] as SupportedImageExtension;
    return value===buildBoardGameImagePublicUrl(objectPath,origin)?{objectPath,extension}:null;
  } catch { return null; }
}
