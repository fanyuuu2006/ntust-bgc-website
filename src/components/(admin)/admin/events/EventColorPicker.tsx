"use client";

import { Check } from "lucide-react";
import { getCalendarColor } from "@/utils/calendar-color";

const PRESET_COLORS = ["#2563EB", "#F97316", "#7C3AED", "#16A34A", "#DC2626"];

export function EventColorPicker({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: string | null;
  onChange: (color: string | null) => void;
  disabled?: boolean;
}) {
  const color = getCalendarColor(value);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="常用活動顏色">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-label={`選擇顏色 ${preset}`}
            aria-pressed={color.toLowerCase() === preset.toLowerCase()}
            disabled={disabled}
            onClick={() => onChange(preset)}
            className="grid h-9 w-9 place-items-center rounded-full border-2 border-transparent p-0.5 transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) aria-pressed:border-(--text-primary)"
            style={{ color: preset }}
          >
            <span className="grid h-full w-full place-items-center rounded-full" style={{ backgroundColor: preset }}>
              {color.toLowerCase() === preset.toLowerCase() ? <Check aria-hidden="true" className="h-4 w-4 text-white drop-shadow" /> : null}
            </span>
          </button>
        ))}
        <label htmlFor={id} className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-sm text-(--text-secondary) hover:bg-(--surface-subtle) ${!PRESET_COLORS.includes(color.toUpperCase()) ? "border-(--text-primary)" : "border-(--border-default)"}`}>
          <input id={id} type="color" value={color} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" />
          自訂
        </label>
      </div>
    </div>
  );
}
