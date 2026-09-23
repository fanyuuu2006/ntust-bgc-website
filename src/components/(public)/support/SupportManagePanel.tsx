"use client";

import { useState } from "react";

import { AdminListSection } from "@/components/(admin)/admin/AdminListSection";
import { AdminToolbar } from "@/components/(admin)/admin/AdminToolbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormFeedback } from "@/components/FormFeedback";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { ClearableSearchInput } from "@/components/query/ClearableSearchInput";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { apiClient } from "@/libs/api/client";
import type { SupportRecord } from "@/types/database";
import { formatDateTime, formatTaipeiDateTimeLocal } from "@/utils/date";
import {
  SupportRecordStatusBadge,
  supportRecordStatusLabels,
} from "./SupportRecordStatusBadge";
import {
  getSupportRecordStatus,
  type SupportRecordStatus,
} from "./support-record-status";
import {
  filterAndSortSupportRecords,
  getSupportRecordSummary,
  type SupportRecordSort,
} from "./support-record-collection";

type RecordResponse = { data: SupportRecord };
type StatusFilter = "all" | SupportRecordStatus;
type ConfirmationAction = "withdraw" | "refund";

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "全部" },
  ...(
    [
      "awaiting-consent",
      "ready-to-publish",
      "published",
      "withdrawn",
      "refunded",
    ] as const
  ).map((value) => ({ value, label: supportRecordStatusLabels[value] })),
];

const sortOptions: Array<{ value: SupportRecordSort; label: string }> = [
  { value: "paid-desc", label: "付款時間：新到舊" },
  { value: "paid-asc", label: "付款時間：舊到新" },
  { value: "status", label: "狀態" },
];

function CreateSupportModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (record: SupportRecord) => void;
}) {
  const [provider, setProvider] = useState("");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(() => formatTaipeiDateTimeLocal(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await apiClient<RecordResponse>("/api/support/manage", {
        method: "POST",
        body: { provider, providerTransactionReference: reference, paidAt },
      });
      onCreated(result.data);
      setReference("");
      setPaidAt(formatTaipeiDateTimeLocal(new Date()));
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "新增失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeDisabled={busy}
      title="新增已核對支持"
      description="請先在第三方付款平台確認交易。新增私人紀錄不代表支持者同意公開名稱。"
    >
      <form onSubmit={addRecord} className="space-y-4">
        <Field label="付款平台" htmlFor="support-provider" required>
          <Input id="support-provider" required maxLength={40} value={provider} disabled={busy} onChange={(event) => setProvider(event.target.value)} />
        </Field>
        <Field label="平台交易參照" htmlFor="support-reference" required>
          <Input id="support-reference" required maxLength={160} value={reference} disabled={busy} onChange={(event) => setReference(event.target.value)} />
        </Field>
        <Field label="付款時間（台灣時間）" htmlFor="support-paid-at" required>
          <Input id="support-paid-at" type="datetime-local" required value={paidAt} disabled={busy} onChange={(event) => setPaidAt(event.target.value)} />
        </Field>
        <FormFeedback error={error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>取消</Button>
          <Button type="submit" isLoading={busy}>新增私人紀錄</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ManageSupportRecordModal({ record, onClose, onSaved }: {
  record: SupportRecord;
  onClose: () => void;
  onSaved: (record: SupportRecord) => void;
}) {
  const [displayName, setDisplayName] = useState(record.public_display_name ?? "");
  const [consentMethod, setConsentMethod] = useState(record.public_consent_method ?? "");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = getSupportRecordStatus(record);

  async function update(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const result = await apiClient<RecordResponse>(`/api/support/manage/${record.id}`, { method: "PATCH", body });
      onSaved(result.data);
      setConsentConfirmed(false);
      setConfirmation(null);
      if (result.data.withdrawn_at) {
        setDisplayName("");
        setConsentMethod("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "更新失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  const hasConsent = Boolean(record.public_consent_at);
  const canPublish = status === "ready-to-publish";
  const isPublished = status === "published";
  const isRefunded = status === "refunded";

  return (
    <>
      <Modal open onClose={onClose} closeDisabled={busy} title="管理支持紀錄" size="lg">
        <div className="space-y-6">
          <section aria-labelledby="support-payment-information" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="support-payment-information" className="font-semibold text-(--text-primary)">付款資訊</h2>
              <SupportRecordStatusBadge record={record} />
            </div>
            <dl className="grid min-w-0 gap-3 rounded-xl bg-(--surface-subtle) p-4 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-(--text-muted)">付款平台</dt>
                <dd className="mt-1 font-medium wrap-anywhere">{record.provider}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-(--text-muted)">付款時間</dt>
                <dd className="mt-1 font-medium">{formatDateTime(record.paid_at)}</dd>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-(--text-muted)">平台交易參照</dt>
                <dd className="mt-1 font-mono text-xs wrap-anywhere">{record.provider_transaction_reference}</dd>
              </div>
            </dl>
          </section>

          {!isRefunded ? (
            <section aria-labelledby="support-public-acknowledgement" className="space-y-4 border-t border-(--border-default) pt-5">
              <div>
                <h2 id="support-public-acknowledgement" className="font-semibold text-(--text-primary)">公開感謝</h2>
                <p className="mt-1 text-sm leading-6 text-(--text-muted)">付款不代表同意公開。請另外確認支持者同意本站顯示指定暱稱。</p>
              </div>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <Field label="同意公開的暱稱" htmlFor={`support-name-${record.id}`}>
                  <Input id={`support-name-${record.id}`} value={displayName} maxLength={40} disabled={busy} onChange={(event) => setDisplayName(event.target.value)} />
                </Field>
                <Field label="同意取得方式" htmlFor={`support-method-${record.id}`}>
                  <Input id={`support-method-${record.id}`} value={consentMethod} maxLength={80} placeholder="例如：平台訊息" disabled={busy} onChange={(event) => setConsentMethod(event.target.value)} />
                </Field>
              </div>
              <label className="flex items-start gap-2 text-sm leading-6 text-(--text-secondary)">
                <input type="checkbox" checked={consentConfirmed} disabled={busy} onChange={(event) => setConsentConfirmed(event.target.checked)} className="mt-1.5" />
                <span>我已核對支持者明確同意在本站公開上述暱稱。</span>
              </label>
              {hasConsent ? <p className="text-xs leading-5 text-(--text-muted)">重新紀錄同意會先撤下目前公開狀態，確認後需再次發布。</p> : null}
              <FormFeedback error={error} />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || !consentConfirmed || !displayName.trim() || !consentMethod.trim()}
                  onClick={() => update({ action: "recordConsent", displayName, consentMethod })}
                >
                  {hasConsent ? "重新紀錄公開同意" : "紀錄公開同意"}
                </Button>
                {canPublish ? <Button size="sm" disabled={busy} onClick={() => update({ action: "publish" })}>公開</Button> : null}
                {isPublished ? (
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmation("withdraw")}>撤下公開</Button>
                ) : null}
                <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirmation("refund")}>標記已退款</Button>
              </div>
            </section>
          ) : (
            <p className="border-t border-(--border-default) pt-5 text-sm text-(--text-muted)">此筆紀錄已標記退款，不會顯示在公開支持者名單。</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmation === "withdraw"}
        onClose={() => setConfirmation(null)}
        onConfirm={() => void update({ action: "withdraw" })}
        title="撤下公開暱稱？"
        description="撤下後將立即停止在支持者名單顯示；私人付款核對紀錄仍會保留。"
        confirmLabel="撤下公開"
        confirmVariant="primary"
        isSubmitting={busy}
      />
      <ConfirmDialog
        open={confirmation === "refund"}
        onClose={() => setConfirmation(null)}
        onConfirm={() => void update({ action: "refund" })}
        title="標記為已退款？"
        description="請先確認已在付款平台完成退款。這裡只記錄退款狀態，不會執行退款。"
        confirmLabel="標記已退款"
        confirmVariant="danger"
        isSubmitting={busy}
      />
    </>
  );
}

function SupportRecordCollection({ records, onManage }: {
  records: SupportRecord[];
  onManage: (record: SupportRecord) => void;
}) {
  return (
    <>
      <AdminListSection className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>平台</TableHead>
              <TableHead>付款時間</TableHead>
              <TableHead>公開暱稱</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="max-w-48 font-medium wrap-anywhere">{record.provider}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDateTime(record.paid_at)}</TableCell>
                <TableCell className="max-w-56 wrap-anywhere">{record.public_display_name ?? "尚未設定"}</TableCell>
                <TableCell className="whitespace-nowrap"><SupportRecordStatusBadge record={record} /></TableCell>
                <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => onManage(record)}>管理</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminListSection>

      <ul className="grid min-w-0 gap-3 lg:hidden">
        {records.map((record) => (
          <li key={record.id}>
            <Card className="p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-(--text-primary) wrap-anywhere">{record.provider}</p>
                  <p className="mt-1 text-xs text-(--text-muted)">{formatDateTime(record.paid_at)}</p>
                </div>
                <SupportRecordStatusBadge record={record} />
              </div>
              <p className="mt-3 text-sm text-(--text-secondary) wrap-anywhere">公開暱稱：{record.public_display_name ?? "尚未設定"}</p>
              <div className="mt-3 flex justify-end border-t border-(--border-muted) pt-3">
                <Button size="sm" variant="outline" onClick={() => onManage(record)}>管理</Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

export function SupportManagePanel({ initialRecords }: { initialRecords: SupportRecord[] }) {
  const [records, setRecords] = useState(initialRecords);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SupportRecordSort>("paid-desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRecord = records.find((record) => record.id === selectedId) ?? null;
  const filteredRecords = filterAndSortSupportRecords(records, { query, status: filter, sort });
  const hasCollectionFilter = query.trim().length > 0 || filter !== "all";
  const summary = getSupportRecordSummary({
    loadedCount: records.length,
    resultCount: filteredRecords.length,
    filtered: hasCollectionFilter,
  });

  function replaceRecord(updated: SupportRecord) {
    setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="支持紀錄管理"
        description="僅供網站開發者核對已完成的支持與公開同意；本站不處理付款或退款。"
        actions={<Button onClick={() => setCreateOpen(true)}>新增已核對支持</Button>}
      />

      {records.length === 0 ? (
        <EmptyState
          title="目前沒有支持紀錄"
          description="請先在第三方付款平台確認交易，再新增私人核對紀錄。"
          action={<Button onClick={() => setCreateOpen(true)}>新增已核對支持</Button>}
        />
      ) : (
        <section aria-labelledby="support-records-title" className="space-y-4">
          <div>
            <h2 id="support-records-title" className="text-lg font-semibold text-(--text-primary)">支持紀錄</h2>
          </div>
          <AdminToolbar
            aria-label="支持紀錄搜尋、篩選與排序"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_13rem] lg:items-end"
          >
            <div className="sm:col-span-2 lg:col-span-1">
              <ClearableSearchInput
                value={query}
                onValueChange={setQuery}
                onClear={() => setQuery("")}
                placeholder="搜尋平台、交易參照或公開暱稱"
                aria-label="搜尋支持紀錄"
              />
            </div>
            <Field label="狀態" htmlFor="support-status-filter">
              <Select id="support-status-filter" value={filter} onChange={(event) => setFilter(event.target.value as StatusFilter)}>
                {statusFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
            <Field label="排序" htmlFor="support-sort">
              <Select id="support-sort" value={sort} onChange={(event) => setSort(event.target.value as SupportRecordSort)}>
                {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
          </AdminToolbar>
          <p aria-live="polite" className="text-sm tabular-nums text-(--text-muted)">{summary}</p>

          {filteredRecords.length === 0 ? (
            <EmptyState
              compact
              title="找不到符合條件的支持紀錄"
              description="請調整搜尋文字或狀態篩選。"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {query.trim() ? <Button size="sm" variant="outline" onClick={() => setQuery("")}>清除搜尋</Button> : null}
                  {filter !== "all" ? <Button size="sm" variant="outline" onClick={() => setFilter("all")}>顯示全部狀態</Button> : null}
                </div>
              }
            />
          ) : (
            <SupportRecordCollection records={filteredRecords} onManage={(record) => setSelectedId(record.id)} />
          )}
        </section>
      )}

      <CreateSupportModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(record) => setRecords((current) => [record, ...current].slice(0, 100))}
      />
      {selectedRecord ? (
        <ManageSupportRecordModal
          key={selectedRecord.id}
          record={selectedRecord}
          onClose={() => setSelectedId(null)}
          onSaved={replaceRecord}
        />
      ) : null}
    </div>
  );
}
