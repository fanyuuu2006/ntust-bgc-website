"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/FormFeedback";
import { FieldInput } from "@/components/FieldInput";
import { ApiError } from "@/libs/api/errors";
import { apiClient } from "@/libs/api/client";
import { createBoardGameSchema, updateBoardGameSchema } from "@/services/board-games/board-games.schema";
import type {
  BoardGameCategory,
  BoardGameLocation,
  BoardGameStatus,
} from "@/types/database";
import { cn } from "@/utils/className";
import { BOARD_GAME_STATUS_LABEL } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";

type BoardGameFormMode = "create" | "edit";

type BoardGameFormValues = {
  name: string;
  inventory_number: string;
  description: string;
  image: string;
  category_id: string;
  location_id: string;
  status: BoardGameStatus;
};

type BoardGameFormProps = {
  mode: BoardGameFormMode;
  boardGameId?: string;
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  initialValues?: Partial<BoardGameFormValues>;
};

const DEFAULT_VALUES: BoardGameFormValues = {
  name: "",
  inventory_number: "",
  description: "",
  image: "",
  category_id: "",
  location_id: "",
  status: "available",
};

function buildInitialValues(
  initialValues?: Partial<BoardGameFormValues>,
): BoardGameFormValues {
  return {
    ...DEFAULT_VALUES,
    ...initialValues,
    inventory_number: initialValues?.inventory_number ?? "",
    description: initialValues?.description ?? "",
    image: initialValues?.image ?? "",
    status: initialValues?.status ?? "available",
  };
}

function getFieldErrors(
  values: BoardGameFormValues,
  mode: BoardGameFormMode,
): Partial<Record<keyof BoardGameFormValues, string>> {
  const errors: Partial<Record<keyof BoardGameFormValues, string>> = {};
  const schema = mode === "create" ? createBoardGameSchema : updateBoardGameSchema;

  const payload = {
    ...values,
    inventory_number: values.inventory_number === "" ? undefined : Number(values.inventory_number),
    description: values.description.trim() === "" ? undefined : values.description,
    image: values.image.trim() === "" ? null : values.image,
    status: values.status,
  };

  const result = schema.safeParse(payload);
  if (result.success) {
    return errors;
  }

  for (const issue of result.error.issues) {
    const [fieldName] = issue.path;
    if (typeof fieldName === "string") {
      const key = fieldName as keyof BoardGameFormValues;
      if (!errors[key]) {
        errors[key] = issue.message;
      }
    }
  }

  return errors;
}

export function BoardGameForm({
  mode,
  boardGameId,
  categories,
  locations,
  initialValues,
}: BoardGameFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<BoardGameFormValues>(() =>
    buildInitialValues(initialValues),
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof BoardGameFormValues, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = useMemo<BoardGameStatus[]>(
    () => [
      "available",
      "borrowed",
      "maintenance",
      "lost",
      "damaged",
      "retired",
    ],
    [],
  );

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    const fieldName = name as keyof BoardGameFormValues;

    setValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    setFormError(null);
    setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = getFieldErrors(values, mode);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload = {
      name: values.name.trim(),
      inventory_number: Number(values.inventory_number),
      description: values.description.trim() === "" ? undefined : values.description.trim(),
      image: values.image.trim() === "" ? null : values.image.trim(),
      category_id: values.category_id,
      location_id: values.location_id,
      status: values.status,
    };

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        await apiClient("/api/admin/board-games", {
          method: "POST",
          body: payload,
        });
      } else {
        await apiClient(`/api/admin/board-games/${boardGameId}`, {
          method: "PATCH",
          body: payload,
        });
      }

      router.push("/admin/board-games");
      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "儲存桌遊失敗，請稍後再試",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="card rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-(--border) pb-2">
              <h2 className="text-base font-semibold text-(--foreground)">基本資訊</h2>
            </div>

            <FieldInput
              field={{
                id: "name",
                label: "名稱",
                type: "text",
                required: true,
                placeholder: "請輸入桌遊名稱",
                error: errors.name,
              }}
              value={values.name}
              onChange={handleChange}
            />

            <FieldInput
              field={{
                id: "inventory_number",
                label: "庫存編號",
                type: "number",
                required: true,
                placeholder: "例如：101",
                error: errors.inventory_number,
              }}
              value={values.inventory_number}
              onChange={handleChange}
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="description"
                className="text-sm font-medium text-(--foreground)"
              >
                描述
              </label>
              <textarea
                id="description"
                name="description"
                value={values.description}
                onChange={handleChange}
                placeholder="請輸入桌遊簡介或說明"
                rows={6}
                aria-invalid={!!errors.description}
                className={cn(
                  "w-full rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm text-(--foreground) outline-none transition-colors placeholder:text-(--muted) focus:border-(--primary)",
                  {
                    "border-(--game-red)": !!errors.description,
                  },
                )}
              />
              {errors.description && (
                <p className="text-xs text-(--game-red)">{errors.description}</p>
              )}
            </div>

            <FieldInput
              field={{
                id: "image",
                label: "圖片連結",
                type: "url",
                placeholder: "https://example.com/board-game.jpg",
                error: errors.image,
              }}
              value={values.image}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-(--border) pb-2">
              <h2 className="text-base font-semibold text-(--foreground)">管理資訊</h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="category_id" className="text-sm font-medium text-(--foreground)">
                分類
              </label>
              <select
                id="category_id"
                name="category_id"
                value={values.category_id}
                onChange={handleChange}
                required
                aria-invalid={!!errors.category_id}
                className={cn(
                  "w-full rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm text-(--foreground) outline-none transition-colors focus:border-(--primary)",
                  { "border-(--game-red)": !!errors.category_id },
                )}
              >
                <option value="">請選擇分類</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-xs text-(--game-red)">{errors.category_id}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="location_id" className="text-sm font-medium text-(--foreground)">
                位置
              </label>
              <select
                id="location_id"
                name="location_id"
                value={values.location_id}
                onChange={handleChange}
                required
                aria-invalid={!!errors.location_id}
                className={cn(
                  "w-full rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm text-(--foreground) outline-none transition-colors focus:border-(--primary)",
                  { "border-(--game-red)": !!errors.location_id },
                )}
              >
                <option value="">請選擇位置</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              {errors.location_id && (
                <p className="text-xs text-(--game-red)">{errors.location_id}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="status" className="text-sm font-medium text-(--foreground)">
                狀態
              </label>
              <select
                id="status"
                name="status"
                value={values.status}
                onChange={handleChange}
                required
                aria-invalid={!!errors.status}
                className={cn(
                  "w-full rounded-lg border border-(--border) bg-(--secondary-background) px-3 py-2 text-sm text-(--foreground) outline-none transition-colors focus:border-(--primary)",
                  { "border-(--game-red)": !!errors.status },
                )}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {BOARD_GAME_STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="text-xs text-(--game-red)">{errors.status}</p>
              )}
            </div>
          </div>
        </div>

        <FormFeedback error={formError} />

        <div className="flex flex-col gap-3 border-t border-(--border) pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn rounded-lg px-4 py-2 text-sm"
            onClick={() => router.push("/admin/board-games")}
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            type="submit"
            className="btn primary rounded-lg px-4 py-2 text-sm"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting
              ? mode === "create"
                ? "新增中..."
                : "更新中..."
              : mode === "create"
                ? "新增桌遊"
                : "更新桌遊"}
          </button>
        </div>
      </div>
    </form>
  );
}
