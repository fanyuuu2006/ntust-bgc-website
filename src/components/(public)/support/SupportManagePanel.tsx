"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { apiClient } from "@/libs/api/client";
import type { SupportRecord } from "@/types/database";
import { formatDateTime, formatTaipeiDateTimeLocal } from "@/utils/date";

type RecordResponse = { data: SupportRecord };

function SupportRecordItem({ record, onSaved }: { record: SupportRecord; onSaved: (record: SupportRecord) => void }) {
  const [displayName, setDisplayName] = useState(record.public_display_name ?? "");
  const [consentMethod, setConsentMethod] = useState(record.public_consent_method ?? "");
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(body: unknown) {
    setBusy(true);
    setError("");
    try {
      const result = await apiClient<RecordResponse>(`/api/support/manage/${record.id}`, { method: "PATCH", body });
      onSaved(result.data);
      setConsentConfirmed(false);
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

  const isPublic = record.payment_status === "paid" && record.published_at && !record.withdrawn_at;

  return (
    <li>
      <Card surface="subtle" className="space-y-3 p-3 sm:p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-(--text-primary) wrap-anywhere">{record.provider}</p>
            <p className="text-xs text-(--text-muted) wrap-anywhere">平台交易參照：{record.provider_transaction_reference}</p>
            <p className="text-xs text-(--text-muted)">付款時間：{formatDateTime(record.paid_at)}</p>
          </div>
          <span className="text-sm font-medium text-(--text-secondary)">
            {record.payment_status === "refunded" ? "已退款" : isPublic ? "公開中" : record.withdrawn_at ? "已撤下" : "未公開"}
          </span>
        </div>

        {record.payment_status === "paid" ? (
          <div className="space-y-3 border-t border-(--border-default) pt-3">
            <p className="text-sm text-(--text-secondary)">
              {record.public_consent_at ? "已另行取得公開同意；更改暱稱需重新紀錄同意。" : "付款已確認；尚未取得公開暱稱的獨立同意。"}
            </p>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <Field label="同意公開的暱稱" htmlFor={`support-name-${record.id}`}>
                <Input id={`support-name-${record.id}`} value={displayName} maxLength={40} disabled={busy} onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
              <Field label="同意取得方式" htmlFor={`support-method-${record.id}`}>
                <Input id={`support-method-${record.id}`} value={consentMethod} maxLength={80} placeholder="例如：平台私訊" disabled={busy} onChange={(event) => setConsentMethod(event.target.value)} />
              </Field>
            </div>
            <label className="flex items-start gap-2 text-sm text-(--text-secondary)">
              <input type="checkbox" checked={consentConfirmed} disabled={busy} onChange={(event) => setConsentConfirmed(event.target.checked)} className="mt-1" />
              <span>我已核對此支持者明確同意在本站公開上述暱稱；付款本身不代表同意。</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy || !consentConfirmed || !displayName.trim() || !consentMethod.trim()} onClick={() => update({ action: "recordConsent", displayName, consentMethod })}>紀錄公開同意</Button>
              {record.public_consent_at && !isPublic && !record.withdrawn_at ? (
                <Button size="sm" disabled={busy} onClick={() => update({ action: "publish" })}>發布暱稱</Button>
              ) : null}
              {isPublic ? <Button size="sm" variant="outline" disabled={busy} onClick={() => update({ action: "withdraw" })}>撤下公開</Button> : null}
              <Button size="sm" variant="danger" disabled={busy} onClick={() => {
                if (window.confirm("確認已在付款平台處理退款？這裡只記錄退款狀態，不會執行退款。")) void update({ action: "refund" });
              }}>標記已退款</Button>
            </div>
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-(--status-danger)">{error}</p> : null}
      </Card>
    </li>
  );
}

export function SupportManagePanel({ initialRecords }: { initialRecords: SupportRecord[] }) {
  const [records, setRecords] = useState(initialRecords);
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
      setRecords((current) => [result.data, ...current].slice(0, 100));
      setReference("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "新增失敗，請稍後再試");
    } finally {
      setBusy(false);
    }
  }

  function replaceRecord(updated: SupportRecord) {
    setRecords((current) => current.map((record) => record.id === updated.id ? updated : record));
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-(--text-primary)">新增已核對的支持</h2>
        <p className="text-sm text-(--text-muted)">請先在第三方平台確認付款。新增紀錄不會自動公開支持者。</p>
        <form onSubmit={addRecord} className="space-y-3">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <Field label="付款平台" htmlFor="support-provider" required><Input id="support-provider" required maxLength={40} value={provider} disabled={busy} onChange={(event) => setProvider(event.target.value)} /></Field>
            <Field label="平台交易參照" htmlFor="support-reference" required><Input id="support-reference" required maxLength={160} value={reference} disabled={busy} onChange={(event) => setReference(event.target.value)} /></Field>
          </div>
          <Field label="付款時間（台灣時間）" htmlFor="support-paid-at" required><Input id="support-paid-at" type="datetime-local" required value={paidAt} disabled={busy} onChange={(event) => setPaidAt(event.target.value)} /></Field>
          <Button type="submit" disabled={busy}>新增私人紀錄</Button>
          {error ? <p role="alert" className="text-sm text-(--status-danger)">{error}</p> : null}
        </form>
      </Card>

      <section aria-labelledby="support-records-title" className="space-y-3">
        <h2 id="support-records-title" className="text-lg font-semibold text-(--text-primary)">支持紀錄</h2>
        <p className="text-sm text-(--text-muted)">顯示最近 100 筆。交易參照僅供此私人頁面核對，不會出現在支持者牆。</p>
        {records.length === 0 ? <p className="text-sm text-(--text-muted)">目前沒有支持紀錄。</p> : (
          <ul className="space-y-3">
            {records.map((record) => <SupportRecordItem key={record.id} record={record} onSaved={replaceRecord} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
