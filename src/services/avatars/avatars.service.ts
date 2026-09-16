import "server-only";

import {
  AVATAR_MAX_BYTES,
  buildAvatarPublicUrl,
  createAvatarObjectPath,
  parseOwnedAvatarUrl,
} from "@/libs/avatar/image";
import { SUPABASE_URL } from "@/libs/env";
import { detectSupportedImage } from "@/libs/images/file-signature";
import { reportUnexpectedError } from "@/libs/observability/report";
import { avatarStorageRepository } from "@/repositories/avatar-storage.repository";
import { usersRepository } from "@/repositories/users.repository";
import {
  AvatarImageInputError,
  AvatarMutationConflictError,
} from "./avatars.errors";

export async function validateAvatarFile(file: File) {
  if (file.size === 0) throw new AvatarImageInputError("頭像檔案不可為空");
  if (file.size > AVATAR_MAX_BYTES) {
    throw new AvatarImageInputError("頭像檔案不可超過 2 MiB");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectSupportedImage(bytes);
  if (!detected) throw new AvatarImageInputError("僅支援 JPEG、PNG 或 WebP 圖片");
  if (file.type !== detected.mimeType) {
    throw new AvatarImageInputError("圖片格式與檔案內容不一致");
  }
  return { bytes, detected };
}

async function bestEffortRemove(objectPath: string): Promise<void> {
  try {
    await avatarStorageRepository.remove(objectPath);
  } catch (error) {
    reportUnexpectedError(error, { context: "avatar.cleanup" });
  }
}

export async function removeOwnedAvatarObject(
  userId: string,
  avatar: string | null,
): Promise<void> {
  if (!avatar) return;
  const owned = parseOwnedAvatarUrl(avatar, userId, SUPABASE_URL);
  if (owned) await bestEffortRemove(owned.objectPath);
}

export const avatarsService = {
  replace: async (userId: string, file: File): Promise<{ avatar: string }> => {
    const current = await usersRepository.findById(userId);
    if (!current || current.closed_at) throw new AvatarMutationConflictError();
    const expectedAvatar = current.avatar;
    const { bytes, detected } = await validateAvatarFile(file);
    const objectPath = createAvatarObjectPath(userId, detected.extension);
    const avatar = buildAvatarPublicUrl(objectPath, SUPABASE_URL);
    await avatarStorageRepository.upload(objectPath, bytes, detected.mimeType);

    let updated;
    try {
      updated = await usersRepository.compareAndSwapAvatar(
        userId,
        expectedAvatar,
        avatar,
      );
    } catch (error) {
      await bestEffortRemove(objectPath);
      throw error;
    }
    if (!updated) {
      await bestEffortRemove(objectPath);
      throw new AvatarMutationConflictError();
    }

    await removeOwnedAvatarObject(userId, expectedAvatar);
    return { avatar };
  },

  remove: async (userId: string): Promise<{ avatar: null }> => {
    const current = await usersRepository.findById(userId);
    if (!current || current.closed_at) throw new AvatarMutationConflictError();
    const expectedAvatar = current.avatar;
    if (expectedAvatar === null) return { avatar: null };
    const updated = await usersRepository.compareAndSwapAvatar(
      userId,
      expectedAvatar,
      null,
    );
    if (!updated) throw new AvatarMutationConflictError();
    await removeOwnedAvatarObject(userId, expectedAvatar);
    return { avatar: null };
  },
};
