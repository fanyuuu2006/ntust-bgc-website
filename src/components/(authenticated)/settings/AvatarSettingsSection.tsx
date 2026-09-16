"use client";

import { AvatarManagement } from "@/components/avatars/AvatarManagement";
import type { User } from "@/types/database";

export function AvatarSettingsSection({ user }: { user: Pick<User, "id" | "name" | "avatar"> }) {
  return <section aria-labelledby="avatar-settings-title">
    <h4 id="avatar-settings-title" className="mb-3 font-semibold text-(--text-primary)">頭像</h4>
    <AvatarManagement user={user} endpoint="/api/users/me/avatar" />
  </section>;
}
