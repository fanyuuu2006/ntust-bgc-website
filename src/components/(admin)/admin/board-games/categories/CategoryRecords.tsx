"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { QueryEmptyState } from "@/components/query/QueryEmptyState";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { apiClient } from "@/libs/api/client";
import type { BoardGameCategory } from "@/types/database";

type CategoryRecord = BoardGameCategory & { count: number };

export function CategoryRecords({ items, hasQuery = false }: { items: CategoryRecord[]; hasQuery?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryRecord | null>(null);
  const [deleting, setDeleting] = useState<CategoryRecord | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openEdit(category: CategoryRecord) {
    setEditing(category);
    setName(category.name);
    setDescription(category.description ?? "");
    setMessage(null);
  }

  function openDelete(category: CategoryRecord) {
    if (category.count > 0) {
      setMessage(`「${category.name}」目前仍有 ${category.count} 款桌遊使用，無法刪除。`);
      return;
    }
    setDeleting(category);
  }

  function closeEdit() {
    if (!busy) {
      setEditing(null);
      setMessage(null);
    }
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || busy) return;

    setBusy(true);
    setMessage(null);
    try {
      await apiClient("/api/admin/board-game-categories/" + editing.id, {
        method: "PATCH",
        body: { name, description: description || null },
      });
      setEditing(null);
      router.refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "更新桌遊分類失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting || busy) return;

    setBusy(true);
    setMessage(null);
    try {
      await apiClient("/api/admin/board-game-categories/" + deleting.id, {
        method: "DELETE",
      });
      setDeleting(null);
      router.refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "刪除桌遊分類失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <FormFeedback error={message} />

      {items.length === 0 && hasQuery ? (
        <QueryEmptyState
          title="找不到符合條件的桌遊分類"
          clearHref="/admin/board-games/categories"
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="目前沒有桌遊分類"
          description="請從頁面標題旁的新增分類開始建立資料。"
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {items.map((category) => (
              <Card key={category.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{category.name}</h2>
                    <p className="mt-1 break-words text-sm text-(--muted)">
                      {category.description || "未填寫說明"}
                    </p>
                    <p className="mt-2 text-xs text-(--muted)">
                      使用中的桌遊：{category.count} 款
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => openEdit(category)}>
                      編輯
                    </Button>
                    <Button type="button" size="sm" variant="danger" onClick={() => openDelete(category)}>
                      刪除
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">名稱</th>
                  <th className="px-4 py-3">說明</th>
                  <th className="px-4 py-3">使用中的桌遊</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((category) => (
                  <tr key={category.id} className="border-t border-(--border)">
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="max-w-md px-4 py-3 break-words text-(--muted)">
                      {category.description || "未填寫說明"}
                    </td>
                    <td className="px-4 py-3">{category.count} 款</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openEdit(category)}>
                          編輯
                        </Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => openDelete(category)}>
                          刪除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Modal open={editing !== null} onClose={closeEdit} title="編輯桌遊分類">
        <form onSubmit={saveEdit} className="space-y-4">
          <Field label="名稱" htmlFor="category-name">
            <Input
              id="category-name"
              className="w-full"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="說明" htmlFor="category-description">
            <Textarea
              id="category-description"
              className="w-full"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={closeEdit}>
              取消
            </Button>
            <Button type="submit" isLoading={busy}>
              {busy ? "儲存中…" : "儲存"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => !busy && setDeleting(null)}
        onConfirm={remove}
        isSubmitting={busy}
        title="刪除桌遊分類"
        description={deleting ? "確定要刪除「" + deleting.name + "」嗎？" : ""}
      />
    </div>
  );
}
