"use client";

import { getAdminReturnPath } from "@/utils/admin-return";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/FormFeedback";
import { FieldInput } from "@/components/FieldInput";
import { BoardGameImage } from "@/components/BoardGameImage";
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
import { Card } from "@/components/ui/Card";
import { RichContentPreview } from "@/components/RichContentPreview";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import dynamic from "next/dynamic";
import { editableRichContent, readRichContent } from "@/libs/rich-content/content";
import { storedDescription } from "@/libs/rich-content/description";
const RichTextEditor = dynamic(() => import("@/components/RichTextEditor").then((module) => module.RichTextEditor), { ssr: false });

type BoardGameFormMode = "create" | "edit";

type BoardGameFormValues = {
  name: string;
  inventory_number: string;
  description: string;
  description_format?: string;
  rich_description?: unknown;
  image: string;
  category_id: string;
  location_id: string;
  status: BoardGameStatus;
};

type BoardGameFormProps = {
  mode: BoardGameFormMode;
  returnTo?: string;
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
      const key = (fieldName === "rich_description" || fieldName === "description_format" ? "description" : fieldName) as keyof BoardGameFormValues;
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
  returnTo,
}: BoardGameFormProps) {
  const router = useRouter();
  const returnHref = getAdminReturnPath(returnTo, "/admin/board-games");
  const [values, setValues] = useState<BoardGameFormValues>(() =>
    buildInitialValues(initialValues),
  );
  const [initialDescription] = useState(() => editableRichContent(storedDescription(initialValues)));
  const [richDescription, setRichDescription] = useState<unknown>(initialDescription);
  const unsupportedDescription = !!initialValues?.description_format && initialValues.description_format !== "plain_text" && !readRichContent(storedDescription(initialValues));
  const [errors, setErrors] = useState<
    Partial<Record<keyof BoardGameFormValues, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageUrl = values.image.trim();
  // 預覽只讓瀏覽器載入 HTTP(S) 圖片，不使用 Server fetch，也不改變既有儲存 schema。
  let previewUrl: string | null = null;
  try {
    const url = new URL(imageUrl);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) previewUrl = imageUrl;
  } catch { /* 尚未輸入完整網址時不發出圖片請求。 */ }

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
    if (fieldName === "image") setFailedImage(null);

    setValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));

    setFormError(null);
    setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (unsupportedDescription) { setFormError("此描述格式暫不支援編輯，原始資料不會被覆寫。"); return; }
    const nextErrors = getFieldErrors({ ...values, description_format: "rich_text_v1", rich_description: richDescription }, mode);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const payload = {
      name: values.name.trim(),
      inventory_number: Number(values.inventory_number),
      description_format: "rich_text_v1",
      rich_description: richDescription,
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

      router.push(returnHref);
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
    <Card className="p-4 sm:p-6">
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <section className="space-y-4" aria-labelledby="board-game-basics">
          <h2 id="board-game-basics" className="border-b border-(--border-default) pb-2 text-base font-semibold text-(--text-primary)">基本資料</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <FieldInput field={{ id: "name", label: "桌遊名稱", type: "text", required: true, placeholder: "請輸入桌遊名稱", error: errors.name }} value={values.name} onChange={handleChange} />
            <FieldInput field={{ id: "inventory_number", label: "社產編號", type: "number", required: true, placeholder: "例如：101", error: errors.inventory_number }} value={values.inventory_number} onChange={handleChange} />
          <Field label="狀態" htmlFor="status" error={errors.status} required>
            <Select id="status" name="status" value={values.status} onChange={handleChange} required invalid={!!errors.status} aria-describedby={errors.status ? "status-error" : undefined}>
              {statusOptions.map((status) => <option key={status} value={status}>{BOARD_GAME_STATUS_LABEL[status]}</option>)}
            </Select>
          </Field>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="board-game-classification">
          <h2 id="board-game-classification" className="border-b border-(--border-default) pb-2 text-base font-semibold text-(--text-primary)">種類與位置</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="種類" htmlFor="category_id" error={errors.category_id} required>
              <Select id="category_id" name="category_id" value={values.category_id} onChange={handleChange} required invalid={!!errors.category_id} aria-describedby={errors.category_id ? "category_id-error" : undefined}>
                <option value="">請選擇種類</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </Select>
            </Field>
            <Field label="位置" htmlFor="location_id" error={errors.location_id} required>
              <Select id="location_id" name="location_id" value={values.location_id} onChange={handleChange} required invalid={!!errors.location_id} aria-describedby={errors.location_id ? "location_id-error" : undefined}>
                <option value="">請選擇位置</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </Select>
            </Field>
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="board-game-content">
          <h2 id="board-game-content" className="border-b border-(--border-default) pb-2 text-base font-semibold text-(--text-primary)">介紹</h2>
          <Field label="描述" htmlFor="description" error={errors.description} action={<RichContentPreview value={richDescription} title={values.name} label="桌遊介紹預覽" />}>
            <RichTextEditor id="description" label="桌遊描述" initialContent={initialDescription} onChange={setRichDescription} disabled={isSubmitting || unsupportedDescription} invalid={!!errors.description} />
            <p className="text-xs text-(--text-muted)">{unsupportedDescription ? "此描述格式暫不支援編輯。" : "可留空；格式化內容最多 20,000 字元。"}</p>
          </Field>
        </section>

        <section className="space-y-4" aria-labelledby="board-game-image">
          <h2 id="board-game-image" className="border-b border-(--border-default) pb-2 text-base font-semibold text-(--text-primary)">圖片</h2>
          <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
            <FieldInput field={{ id: "image", label: "圖片網址", type: "url", placeholder: "https://example.com/board-game.jpg", hint: "可留空；預覽由瀏覽器載入外部圖片。", error: errors.image }} value={values.image} onChange={handleChange} onBlur={() => {
              const result = updateBoardGameSchema.safeParse({ image: values.image });
              setErrors((previous) => ({ ...previous, image: result.success ? undefined : result.error.issues[0]?.message }));
            }} />
            <figure className="min-w-0 space-y-2">
              <figcaption className="text-sm font-medium text-(--text-primary)">圖片預覽</figcaption>
              <div className="flex h-32 items-center justify-center overflow-hidden rounded-lg border border-(--border-muted) bg-(--surface-subtle) md:h-36">
                {previewUrl && failedImage !== previewUrl ? <BoardGameImage key={previewUrl} boardGame={{ name: values.name || "桌遊圖片預覽", image: previewUrl }} className="h-full w-full object-contain" referrerPolicy="no-referrer" onError={() => setFailedImage(previewUrl)} /> : <p className="px-3 text-center text-sm text-(--text-muted)">{!imageUrl ? "尚未設定圖片" : previewUrl && failedImage === previewUrl ? "無法載入圖片，請確認網址。" : "輸入 HTTP 或 HTTPS 圖片網址以預覽。"}</p>}
              </div>
            </figure>
          </div>
        </section>

        <FormFeedback error={formError} />

        <div className="flex flex-col gap-3 border-t border-(--border-default) pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push(returnHref)} disabled={isSubmitting}>取消</Button>
          <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
            {isSubmitting ? mode === "create" ? "新增中..." : "儲存中..." : mode === "create" ? "新增桌遊" : "儲存變更"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
