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
import { BOARD_GAME_STATUS_LABEL } from "@/components/(admin)/admin/board-games/BoardGameStatusBadge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

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
    description: values.description.trim() === "" ? null : values.description,
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
      description: values.description.trim() === "" ? null : values.description.trim(),
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
            <div className="flex items-center justify-between gap-2 border-b border-(--border-default) pb-2">
              <h2 className="text-base font-semibold text-(--text-primary)">基本資訊</h2>
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
                label: "編號",
                type: "number",
                required: true,
                placeholder: "例如：101",
                error: errors.inventory_number,
              }}
              value={values.inventory_number}
              onChange={handleChange}
            />

            <Field label="描述" htmlFor="description" error={errors.description}>
              <Textarea
                id="description"
                name="description"
                value={values.description}
                onChange={handleChange}
                placeholder="請輸入桌遊簡介或說明"
                rows={6}
                invalid={!!errors.description}
              />
            </Field>

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
            <div className="flex items-center justify-between gap-2 border-b border-(--border-default) pb-2">
              <h2 className="text-base font-semibold text-(--text-primary)">管理資訊</h2>
            </div>

            <Field label="分類" htmlFor="category_id" error={errors.category_id}>
              <Select
                id="category_id"
                name="category_id"
                value={values.category_id}
                onChange={handleChange}
                required
                invalid={!!errors.category_id}
              >
                <option value="">請選擇分類</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="位置" htmlFor="location_id" error={errors.location_id}>
              <Select
                id="location_id"
                name="location_id"
                value={values.location_id}
                onChange={handleChange}
                required
                invalid={!!errors.location_id}
              >
                <option value="">請選擇位置</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="狀態" htmlFor="status" error={errors.status}>
              <Select
                id="status"
                name="status"
                value={values.status}
                onChange={handleChange}
                required
                invalid={!!errors.status}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {BOARD_GAME_STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        <FormFeedback error={formError} />

        <div className="flex flex-col gap-3 border-t border-(--border-default) pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg"
            onClick={() => router.push("/admin/board-games")}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="rounded-lg"
          >
            {isSubmitting
              ? mode === "create"
                ? "新增中..."
                : "更新中..."
              : mode === "create"
                ? "新增桌遊"
                : "更新桌遊"}
          </Button>
        </div>
      </div>
    </form>
  );
}
