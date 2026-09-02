"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { apiClient } from "@/libs/api/client";
import { Plus } from "lucide-react";

export function CategoryCreateAction() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openDialog() {
    setName("");
    setDescription("");
    setError(null);
    setOpen(true);
  }

  function closeDialog() {
    if (!busy) {
      setOpen(false);
      setError(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);
    try {
      await apiClient("/api/admin/board-game-categories", {
        method: "POST",
        body: { name, description: description || null },
      });
      setOpen(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "新增桌遊分類失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={openDialog}>
        <Plus aria-hidden="true" className="size-4" />
        新增分類
      </Button>

      <Modal open={open} onClose={closeDialog} title="新增桌遊分類">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFeedback error={error} />
          <Field label="名稱" htmlFor="create-category-name">
            <Input
              id="create-category-name"
              className="w-full"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="說明" htmlFor="create-category-description">
            <Textarea
              id="create-category-description"
              className="w-full"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={closeDialog}>
              取消
            </Button>
            <Button type="submit" isLoading={busy}>
              {busy ? "新增中…" : "新增"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
