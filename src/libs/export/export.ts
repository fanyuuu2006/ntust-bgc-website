import "server-only";

import writeXlsxFile, { type SheetData } from "write-excel-file/node";
import { z } from "zod";
import type { ExportDocument, ExportFormat, ExportPrimitive } from "./types";

/** Matches the reviewed PostgREST max_rows setting; prevents silent server truncation. */
export const ADMIN_EXPORT_ROW_LIMIT = 1_000;
export const exportFormatSchema = z.enum(["csv", "xlsx", "json"]);

export class ExportRowLimitExceededError extends Error {
  constructor(public readonly total: number) {
    super("符合條件的資料超過匯出上限，請縮小搜尋或篩選範圍後再試一次。");
    this.name = "ExportRowLimitExceededError";
  }
}

const DANGEROUS_SPREADSHEET_PREFIX = /^[\u0000-\u0020]*[=+\-@]/;

export function neutralizeSpreadsheetFormula(value: string): string {
  return DANGEROUS_SPREADSHEET_PREFIX.test(value) ? `'${value}` : value;
}

function formatTaipeiInstant(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function spreadsheetValue(value: ExportPrimitive, kind = "text"): string | number {
  if (value === null) return "";
  if (kind === "number" && typeof value === "number") return value;
  const text = kind === "instant" ? formatTaipeiInstant(String(value)) : String(value);
  return neutralizeSpreadsheetFormula(text);
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeCsv<Row extends Record<string, ExportPrimitive>>(
  document: ExportDocument<Row>,
): Buffer {
  const lines = [
    document.columns.map((column) => escapeCsv(column.header)).join(","),
    ...document.rows.map((row) => document.columns
      .map((column) => escapeCsv(spreadsheetValue(row[column.key], column.kind)))
      .join(",")),
  ];
  return Buffer.from(`\uFEFF${lines.join("\r\n")}`, "utf8");
}

export async function serializeXlsx<Row extends Record<string, ExportPrimitive>>(
  document: ExportDocument<Row>,
): Promise<Buffer> {
  const data: SheetData = [
    document.columns.map((column) => ({ value: column.header, type: String, fontWeight: "bold" })),
    ...document.rows.map((row) => document.columns.map((column) => {
      const value = spreadsheetValue(row[column.key], column.kind);
      return { value, type: typeof value === "number" ? Number : String, wrap: false };
    })),
  ];
  return (await writeXlsxFile(data, {
    sheet: document.worksheetName.slice(0, 31),
    stickyRowsCount: 1,
    columns: document.columns.map((column) => ({ width: column.width ?? 18 })),
  })).toBuffer();
}

export function serializeJson<Row extends Record<string, ExportPrimitive>>(
  document: ExportDocument<Row>,
  exportedAt = new Date(),
): Buffer {
  return Buffer.from(JSON.stringify({
    exportedAt: exportedAt.toISOString(),
    domain: document.domain,
    filters: document.filters,
    count: document.rows.length,
    data: document.rows,
  }, null, 2), "utf8");
}

export function safeFilenameBase(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "export";
}

export async function createExportResponse<Row extends Record<string, ExportPrimitive>>(
  document: ExportDocument<Row>,
  format: ExportFormat,
): Promise<Response> {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
  const filename = `${safeFilenameBase(document.filenameBase)}-${date}.${format}`;
  const body = format === "csv" ? serializeCsv(document)
    : format === "xlsx" ? await serializeXlsx(document)
      : serializeJson(document);
  const contentType = format === "csv" ? "text/csv; charset=utf-8"
    : format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "application/json; charset=utf-8";
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
