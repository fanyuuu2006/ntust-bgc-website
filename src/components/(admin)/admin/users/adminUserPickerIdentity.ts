import type { AdminUserPickerItem } from "@/services/users/users.types";

export function getAdminUserPickerIdentity(user: AdminUserPickerItem) {
  const primary = user.realName?.trim() || user.username || user.email;
  const secondary = [
    primary === user.username ? null : user.username,
    user.studentId,
    primary === user.email ? null : user.email,
  ]
    .filter(Boolean)
    .join(" · ");

  return { primary, secondary };
}
