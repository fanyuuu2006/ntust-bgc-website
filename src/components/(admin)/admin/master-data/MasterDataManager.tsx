"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { apiClient } from "@/libs/api/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Field } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
type Item = {
  id: string;
  name: string;
  description: string | null;
  count: number;
};
type Props = {
  title: string;
  singular: string;
  endpoint: string;
  items: Item[];
};
export function MasterDataManager({ title, singular, endpoint, items }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Item | null | "new">(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const visible = useMemo(
    () =>
      items.filter((item) =>
        `${item.name} ${item.description ?? ""}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
      ),
    [items, search],
  );
  const openCreate = () => {
    setName("");
    setDescription("");
    setEditing("new");
  };
  const openEdit = (item: Item) => {
    setName(item.name);
    setDescription(item.description ?? "");
    setEditing(item);
  };
  const closeEdit = () => {
    if (!busy) setEditing(null);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiClient(
        editing === "new" ? endpoint : `${endpoint}/${editing.id}`,
        {
          method: editing === "new" ? "POST" : "PATCH",
          body: { name, description: description || null },
        },
      );
      setMessage(`${singular}已${editing === "new" ? "新增" : "更新"}。`);
      setEditing(null);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "操作失敗，請稍後再試。",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiClient(`${endpoint}/${deleting.id}`, { method: "DELETE" });
      setMessage(`${singular}已刪除。`);
      setDeleting(null);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "刪除失敗，請稍後再試。",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="min-w-0 flex-1">
          <span className="sr-only">搜尋{title}</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`搜尋${title}`}
            className="w-full"
          />
        </label>
        <Button
          type="button"
          onClick={openCreate}
          className="rounded-lg"
        >
          + 新增{singular}
        </Button>
      </div>
      {message && (
        <p
          role="status"
          className="rounded-lg border border-(--border-default) bg-(--surface-subtle) px-3 py-2 text-sm"
        >
          {message}
        </p>
      )}
      <div className="grid gap-3 md:hidden">
        {visible.map((item) => (
          <article key={item.id} className="card rounded-xl p-4">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold">{item.name}</h2>
                <p className="mt-1 text-sm text-(--text-muted)">
                  {item.description || "尚未填寫說明"}
                </p>
                <p className="mt-2 text-xs text-(--text-muted)">
                  社產數：{item.count}
                </p>
              </div>
              <div className="flex h-fit gap-2">
                <Button
                  onClick={() => openEdit(item)}
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                >
                  編輯
                </Button>
                <Button
                  onClick={() => setDeleting(item)}
                  variant="danger"
                  size="sm"
                  className="rounded-lg"
                >
                  刪除
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="card hidden overflow-x-auto rounded-xl md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-(--surface-subtle)">
            <tr>
              <th className="px-4 py-3">名稱</th>
              <th className="px-4 py-3">說明</th>
              <th className="px-4 py-3">社產數</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id} className="border-t border-(--border-default)">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 text-(--text-muted)">
                  {item.description || "—"}
                </td>
                <td className="px-4 py-3">{item.count}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEdit(item)}
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                    >
                      編輯
                    </Button>
                    <Button
                      onClick={() => setDeleting(item)}
                      variant="danger"
                      size="sm"
                      className="rounded-lg"
                    >
                      刪除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 && (
        <EmptyState description={`沒有符合條件的${title}。`} />
      )}
      <Modal
        open={editing !== null}
        onClose={closeEdit}
        title={editing === "new" ? `新增${singular}` : `編輯${singular}`}
      >
        <form onSubmit={save} className="space-y-4">
          <Field label="名稱" htmlFor="master-data-name">
            <Input
              id="master-data-name"
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="說明（選填）" htmlFor="master-data-description">
            <Textarea
              id="master-data-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={closeEdit}
              variant="outline"
              className="rounded-lg"
            >
              取消
            </Button>
            <Button
              disabled={busy}
              isLoading={busy}
              className="rounded-lg"
            >
              {busy ? "儲存中…" : editing === "new" ? "新增" : "儲存"}
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        onConfirm={remove}
        isSubmitting={busy}
        title={`刪除${singular}？`}
        description={
          deleting
            ? `確定要刪除「${deleting.name}」嗎？此操作無法復原；若仍有 ${deleting.count} 個社產使用，系統會拒絕刪除。`
            : ""
        }
      />
    </div>
  );
}
