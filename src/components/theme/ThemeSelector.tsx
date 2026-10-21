"use client";

import { useId } from "react";

import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useTheme } from "@/contexts/ThemeContext";
import { isThemePreference } from "@/libs/theme";

export function ThemeSelector() {
  const { preference, setPreference } = useTheme();
  const selectId = useId();

  return (
    <Field
      label="顯示主題"
      htmlFor={selectId}
      hint="選擇後會立即套用，不需要另外儲存。"
      hintPlacement="below"
      className="max-w-md"
    >
      <Select
        id={selectId}
        value={preference}
        onChange={(event) => {
          if (isThemePreference(event.target.value)) setPreference(event.target.value);
        }}
      >
        <option value="system">跟隨系統（預設）</option>
        <option value="light">淺色</option>
        <option value="dark">深色</option>
      </Select>
    </Field>
  );
}
