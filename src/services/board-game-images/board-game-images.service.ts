import "server-only";
import { BOARD_GAME_IMAGE_MAX_BYTES,buildBoardGameImagePublicUrl,createBoardGameImageObjectPath,parseOwnedBoardGameImageUrl } from "@/libs/board-game-images/image";
import { SUPABASE_URL } from "@/libs/env";
import { detectSupportedImage } from "@/libs/images/file-signature";
import { invalidatePublicData } from "@/libs/cache/public-data";
import { reportUnexpectedError } from "@/libs/observability/report";
import { boardGameImageStorageRepository } from "@/repositories/board-game-image-storage.repository";
import { boardGamesRepository } from "@/repositories/board-games.repository";
import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { BoardGameImageInputError,BoardGameImageMutationConflictError } from "./board-game-images.errors";

export async function validateBoardGameImageFile(file:File){
  if(file.size===0)throw new BoardGameImageInputError("圖片檔案不可為空");
  if(file.size>BOARD_GAME_IMAGE_MAX_BYTES)throw new BoardGameImageInputError("圖片檔案不可超過 4 MiB");
  const bytes=new Uint8Array(await file.arrayBuffer()); const detected=detectSupportedImage(bytes);
  if(!detected)throw new BoardGameImageInputError("僅支援 JPEG、PNG 或 WebP 圖片");
  if(file.type!==detected.mimeType)throw new BoardGameImageInputError("圖片格式與檔案內容不一致");
  return {bytes,detected};
}
async function bestEffortRemove(objectPath:string):Promise<void>{try{await boardGameImageStorageRepository.remove(objectPath);}catch(error){reportUnexpectedError(error,{context:"board-game-image.cleanup"});}}
export async function removeOwnedBoardGameImageObject(boardGameId:string,image:string|null):Promise<void>{if(!image)return;const owned=parseOwnedBoardGameImageUrl(image,boardGameId,SUPABASE_URL);if(owned)await bestEffortRemove(owned.objectPath);}
export const boardGameImagesService={
  replace:async(boardGameId:string,file:File):Promise<{image:string}>=>{
    const current=await boardGamesRepository.findById(boardGameId);if(!current)throw new BoardNotFoundError();
    const expectedImage=current.image;const {bytes,detected}=await validateBoardGameImageFile(file);
    const objectPath=createBoardGameImageObjectPath(boardGameId,detected.extension);const image=buildBoardGameImagePublicUrl(objectPath,SUPABASE_URL);
    await boardGameImageStorageRepository.upload(objectPath,bytes,detected.mimeType);
    let updated;try{updated=await boardGamesRepository.compareAndSwapImage(boardGameId,expectedImage,image);}catch(error){await bestEffortRemove(objectPath);throw error;}
    if(updated.status!=="updated"){
      await bestEffortRemove(objectPath);
      if(updated.status==="missing")throw new BoardNotFoundError();
      throw new BoardGameImageMutationConflictError();
    }
    await removeOwnedBoardGameImageObject(boardGameId,expectedImage);invalidatePublicData("popularGames");return {image};
  },
  remove:async(boardGameId:string):Promise<{image:null}>=>{
    const current=await boardGamesRepository.findById(boardGameId);if(!current)throw new BoardNotFoundError();
    const expectedImage=current.image;if(expectedImage===null)return {image:null};
    const updated=await boardGamesRepository.compareAndSwapImage(boardGameId,expectedImage,null);
    if(updated.status==="missing")throw new BoardNotFoundError();
    if(updated.status==="conflict")throw new BoardGameImageMutationConflictError();
    await removeOwnedBoardGameImageObject(boardGameId,expectedImage);invalidatePublicData("popularGames");return {image:null};
  },
};
