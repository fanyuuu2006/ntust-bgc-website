"use client";

import { getAdminReturnPath } from "@/utils/admin-return";
import { ImageUp, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BoardGameImage } from "@/components/BoardGameImage";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { FieldInput } from "@/components/FieldInput";
import { ApiError } from "@/libs/api/errors";
import { apiClient } from "@/libs/api/client";
import { createBoardGameSchema, updateBoardGameSchema } from "@/services/board-games/board-games.schema";
import type {
  BoardGame,
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
  category_id: string;
  location_id: string;
  status: BoardGameStatus;
};

type BoardGameFormProps = {
  mode: BoardGameFormMode;
  returnTo?: string;
  boardGameId?: string;
  initialImage?: string | null;
  categories: BoardGameCategory[];
  locations: BoardGameLocation[];
  initialValues?: Partial<BoardGameFormValues>;
};

const BOARD_GAME_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type BoardGameMutationResponse = { data: BoardGame };
type BoardGameImageResponse = { data: { image: string | null } };

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KiB`;
}

async function mutateBoardGameImage(endpoint: string, method: "POST" | "DELETE", file?: File): Promise<BoardGameImageResponse> {
  const body = file ? new FormData() : undefined;
  if (file) body?.append("file", file);
  const response = await fetch(endpoint, { method, body });
  const payload = await response.json().catch(() => null) as { data?: { image?: unknown }; message?: unknown } | null;
  if (!response.ok) throw new ApiError(typeof payload?.message === "string" ? payload.message : "圖片操作失敗，請稍後再試", response.status);
  if (!payload?.data || !(typeof payload.data.image === "string" || payload.data.image === null)) throw new ApiError("圖片回應格式不正確", 500);
  return payload as BoardGameImageResponse;
}

const DEFAULT_VALUES: BoardGameFormValues = {
  name: "",
  inventory_number: "",
  description: "",
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
  initialImage = null,
  categories,
  locations,
  initialValues,
  returnTo,
}: BoardGameFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const removingRef = useRef(false);
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageOverride, setImageOverride] = useState<{ base: string | null; value: string | null } | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [imageSuccess, setImageSuccess] = useState<string | null>(null);
  const [createdBoardGameId, setCreatedBoardGameId] = useState<string | null>(null);
  const [ordinaryFieldsSaved, setOrdinaryFieldsSaved] = useState(false);
  const persistedImage = imageOverride?.base === initialImage ? imageOverride.value : initialImage;
  const previewUrl = useMemo(() => selectedImage ? URL.createObjectURL(selectedImage) : null, [selectedImage]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
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
    setOrdinaryFieldsSaved(false);

    setFormError(null);
    setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
  }

  function clearImageSelection() {
    setSelectedImage(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const error = file.size === 0
      ? "圖片檔案不可為空"
      : file.size > BOARD_GAME_IMAGE_MAX_BYTES
        ? "圖片檔案不可超過 4 MiB"
        : !ACCEPTED_IMAGE_TYPES.has(file.type)
          ? "僅支援 JPG、PNG 或 WebP 圖片"
          : null;
    if (error) {
      setImageError(error);
      return;
    }
    setSelectedImage(file);
    setImageError(null);
    setImageSuccess(null);
  }

  async function removeImage() {
    if (!boardGameId || removingRef.current) return;
    removingRef.current = true;
    setIsRemoving(true);
    setRemoveError(null);
    try {
      const result = await mutateBoardGameImage(`/api/admin/board-games/${boardGameId}/image`, "DELETE");
      setImageOverride({ base: initialImage, value: result.data.image });
      clearImageSelection();
      setRemoveOpen(false);
      setImageSuccess("桌遊封面已移除");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setRemoveOpen(false);
        setRemoveError("桌遊已在其他操作中更新，已重新載入最新狀態。");
        router.refresh();
      } else {
        setRemoveError(error instanceof Error ? error.message : "移除桌遊封面失敗，請稍後再試");
      }
    } finally {
      removingRef.current = false;
      setIsRemoving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (createdBoardGameId || submittingRef.current) return;

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
      category_id: values.category_id,
      location_id: values.location_id,
      status: values.status,
    };

    setFormError(null);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      let targetId = boardGameId;
      if (mode === "create") {
        const result = await apiClient<BoardGameMutationResponse>("/api/admin/board-games", {
          method: "POST",
          body: payload,
        });
        targetId = result.data.id;
      } else if (!ordinaryFieldsSaved) {
        await apiClient(`/api/admin/board-games/${boardGameId}`, {
          method: "PATCH",
          body: payload,
        });
        setOrdinaryFieldsSaved(true);
      }

      if (selectedImage && targetId) {
        try {
          const result = await mutateBoardGameImage(`/api/admin/board-games/${targetId}/image`, "POST", selectedImage);
          setImageOverride({ base: initialImage, value: result.data.image });
          clearImageSelection();
        } catch (error) {
          if (mode === "create") setCreatedBoardGameId(targetId);
          if (error instanceof ApiError && error.status === 409) {
            setFormError("桌遊已在其他操作中更新，已重新載入最新狀態。");
            clearImageSelection();
            router.refresh();
          } else {
            setFormError(mode === "create"
              ? "桌遊已建立，但封面圖片上傳失敗。你可以前往編輯頁重新上傳。"
              : "桌遊資料已儲存，但封面圖片上傳失敗。你可以保留目前選擇並重試。");
          }
          return;
        }
      }

      router.push(returnHref);
      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : "儲存桌遊失敗，請稍後再試",
      );
    } finally {
      submittingRef.current = false;
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
            <RichTextEditor id="description" label="桌遊描述" initialContent={initialDescription} onChange={(value) => { setRichDescription(value); setOrdinaryFieldsSaved(false); }} disabled={isSubmitting || unsupportedDescription} invalid={!!errors.description} />
            <p className="text-xs text-(--text-muted)">{unsupportedDescription ? "此描述格式暫不支援編輯。" : "可留空；格式化內容最多 20,000 字元。"}</p>
          </Field>
        </section>

        <section className="space-y-4" aria-labelledby="board-game-cover">
          <h2 id="board-game-cover" className="border-b border-(--border-default) pb-2 text-base font-semibold text-(--text-primary)">桌遊封面</h2>
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="待上傳的桌遊封面預覽" className="h-28 w-24 shrink-0 rounded-lg border border-(--border-default) object-cover" />
            ) : (
              <BoardGameImage boardGame={{ name: values.name || "桌遊", image: persistedImage }} onError={() => setImageOverride({ base: initialImage, value: null })} className="h-28 w-24 shrink-0 rounded-lg border border-(--border-default) object-cover" />
            )}
            <div className="min-w-0 flex-1 space-y-2">
              {selectedImage ? <div><p className="truncate text-sm font-semibold text-(--text-primary)" title={selectedImage.name}>{selectedImage.name}</p><p className="text-xs text-(--text-muted)">{formatFileSize(selectedImage.size)} · 尚未上傳</p></div> : <p className="text-sm text-(--text-muted)">{persistedImage ? "目前使用中的桌遊封面" : "尚未設定桌遊封面"}</p>}
              <div className="flex flex-wrap gap-2">
                <label className="btn outline relative inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-(--interactive-primary)">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelection} disabled={isSubmitting || isRemoving || !!createdBoardGameId} className="absolute inset-0 cursor-pointer opacity-0" aria-label={selectedImage ? "重新選擇桌遊封面" : persistedImage ? "更換桌遊封面" : "選擇桌遊封面"} />
                  {selectedImage ? <RefreshCw aria-hidden="true" className="size-4" /> : <ImageUp aria-hidden="true" className="size-4" />}
                  {selectedImage ? "重新選擇" : persistedImage ? "更換圖片" : "選擇圖片"}
                </label>
                {selectedImage ? <Button type="button" variant="text" onClick={clearImageSelection} disabled={isSubmitting || isRemoving}><Trash2 aria-hidden="true" className="size-4" />清除選擇</Button> : null}
                {persistedImage && mode === "edit" ? <Button type="button" variant="text" onClick={() => { setRemoveError(null); setRemoveOpen(true); }} disabled={isSubmitting || isRemoving}><Trash2 aria-hidden="true" className="size-4" />移除圖片</Button> : null}
              </div>
              <p className="text-xs text-(--text-muted)">支援 JPG、PNG、WebP，最大 4 MB</p>
              <FormFeedback error={imageError || removeError} success={imageSuccess} />
            </div>
          </div>
        </section>

        <FormFeedback error={formError} />

        {createdBoardGameId ? <div className="rounded-xl border border-(--border-default) bg-(--surface-subtle) p-4"><h3 className="font-semibold text-(--text-primary)">桌遊已建立</h3><p className="mt-1 text-sm text-(--text-muted)">封面圖片尚未上傳成功，請前往編輯頁重新上傳。</p><Button type="button" className="mt-3" onClick={() => router.push(`/admin/board-games/${createdBoardGameId}/edit`)}>前往編輯桌遊</Button></div> : null}

        <div className="flex flex-col gap-3 border-t border-(--border-default) pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => router.push(returnHref)} disabled={isSubmitting}>取消</Button>
          <Button type="submit" disabled={isSubmitting || !!createdBoardGameId} isLoading={isSubmitting}>
            {isSubmitting ? mode === "create" ? "新增中..." : "儲存中..." : mode === "create" ? "新增桌遊" : "儲存變更"}
          </Button>
        </div>
      </form>
      <ConfirmDialog open={removeOpen} onClose={() => { if (!isRemoving) setRemoveOpen(false); }} onConfirm={() => { clearImageSelection(); void removeImage(); }} title="移除桌遊封面？" description="確定要移除這張桌遊封面嗎？移除後將顯示預設圖片。" confirmLabel="移除圖片" isSubmitting={isRemoving} size="sm"><FormFeedback error={removeError} /></ConfirmDialog>
    </Card>
  );
}
