import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeAdminRequest } from "@/libs/api/admin-authorization";
import { unexpectedErrorResponse } from "@/libs/api/server-response";
import { BoardNotFoundError } from "@/services/board-games/board-games.errors";
import { BoardGameImageInputError, BoardGameImageMutationConflictError } from "@/services/board-game-images/board-game-images.errors";
import { boardGameImagesService } from "@/services/board-game-images/board-game-images.service";

type RouteContext={params:Promise<{id:string}>};
const idSchema=z.uuid();
const invalidId=()=>NextResponse.json({message:"桌遊 ID 格式不正確"},{status:400});

export async function POST(request:Request,{params}:RouteContext){
  try{
    const authorization=await authorizeAdminRequest("沒有管理桌遊圖片的權限");if(authorization.response)return authorization.response;
    const parsed=idSchema.safeParse((await params).id);if(!parsed.success)return invalidId();
    if(!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;"))return NextResponse.json({message:"請使用 multipart/form-data 上傳圖片"},{status:400});
    let formData:FormData;try{formData=await request.formData();}catch{return NextResponse.json({message:"無法讀取圖片資料"},{status:400});}
    const entries=[...formData.entries()];const files=entries.filter((entry):entry is [string,File]=>typeof entry[1]!=="string");
    if(entries.length!==1||files.length!==1||files[0][0]!=="file")return NextResponse.json({message:"請只提供一個 file 圖片檔案"},{status:400});
    const data=await boardGameImagesService.replace(parsed.data,files[0][1]);return NextResponse.json({data},{status:201});
  }catch(error){
    if(error instanceof BoardGameImageInputError)return NextResponse.json({message:error.message},{status:400});
    if(error instanceof BoardNotFoundError)return NextResponse.json({message:error.message},{status:404});
    if(error instanceof BoardGameImageMutationConflictError)return NextResponse.json({message:error.message},{status:409});
    return unexpectedErrorResponse("[POST /api/admin/board-games/[id]/image]",error,"上傳桌遊圖片失敗，請稍後再試");
  }
}

export async function DELETE(_:Request,{params}:RouteContext){
  try{
    const authorization=await authorizeAdminRequest("沒有管理桌遊圖片的權限");if(authorization.response)return authorization.response;
    const parsed=idSchema.safeParse((await params).id);if(!parsed.success)return invalidId();
    const data=await boardGameImagesService.remove(parsed.data);return NextResponse.json({data});
  }catch(error){
    if(error instanceof BoardNotFoundError)return NextResponse.json({message:error.message},{status:404});
    if(error instanceof BoardGameImageMutationConflictError)return NextResponse.json({message:error.message},{status:409});
    return unexpectedErrorResponse("[DELETE /api/admin/board-games/[id]/image]",error,"移除桌遊圖片失敗，請稍後再試");
  }
}
