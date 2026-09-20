"use client";

import { SearchableEntityPicker } from "@/components/(admin)/admin/SearchableEntityPicker";
import { apiClient } from "@/libs/api/client";
import type { AdminUserPickerItem } from "@/services/users/users.types";
import { getAdminUserPickerIdentity } from "./adminUserPickerIdentity";

type Props = {
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (user: AdminUserPickerItem | null) => void;
};

export function AdminUserPicker({ id, name = "user_id", disabled = false, required = false, onChange }: Props) {
  return (
    <SearchableEntityPicker
      id={id}
      name={name}
      disabled={disabled}
      required={required}
      onChange={onChange}
      search={async (query) => {
        const response = await apiClient<{ data: AdminUserPickerItem[] }>(
          `/api/admin/users/search?search=${encodeURIComponent(query)}`,
        );
        return response.data;
      }}
      getKey={(user) => user.id}
      searchLabel="搜尋使用者"
      searchPlaceholder="搜尋姓名、使用者名稱、學號或 Email"
      resultsLabel="使用者搜尋結果"
      emptyMessage="找不到符合條件的使用者"
      errorMessage="搜尋使用者失敗，請稍後再試"
      clearSelectionLabel={(user) => `清除使用者選擇：${getAdminUserPickerIdentity(user).primary}`}
      renderResult={(user) => <UserIdentity user={user} />}
      renderSelected={(user) => <UserIdentity user={user} />}
    />
  );
}

function UserIdentity({ user }: { user: AdminUserPickerItem }) {
  const { primary, secondary } = getAdminUserPickerIdentity(user);
  return (
    <span className="block min-w-0 text-sm leading-5">
      <span className="block truncate font-semibold text-(--text-primary)" title={primary}>{primary}</span>
      {secondary ? <span className="block truncate text-xs leading-4 text-(--text-secondary)" title={secondary}>{secondary}</span> : null}
    </span>
  );
}
