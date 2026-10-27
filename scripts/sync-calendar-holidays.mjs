#!/usr/bin/env node
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname);
const CACHE_DIR = resolve(ROOT, "src/data/holidays");
const SOURCES = {
  2027: "https://www.dgpa.gov.tw/FileConversion?filename=dgpa%2Ffiles%2F202607%2Ff538b1ff-ba60-4c63-9477-10db8e6612d1.csv&name=116%E5%B9%B4%E4%B8%AD%E8%8F%AF%E6%B0%91%E5%9C%8B%E6%94%BF%E5%BA%9C%E8%A1%8C%E6%94%BF%E6%A9%9F%E9%97%9C%E8%BE%A6%E5%85%AC%E6%97%A5%E6%9B%86%E8%A1%A8_utf8bom.csv&nfix=",
};

function args() {
  const yearIndex = process.argv.indexOf("--year");
  const year = Number(process.argv[yearIndex + 1]);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("請使用 --year 指定有效西元年度");
  return { year, check: process.argv.includes("--check") };
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (const char of text.replace(/^\uFEFF/, "")) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (field || row.length) row.push(field.trim()); if (row.length) rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row); }
  return rows;
}

function normalizeDate(value, year) {
  const match = value.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!match || Number(match[1]) !== year) throw new Error(`日期格式或年度錯誤：${value}`);
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

export function normalizeOfficialCsv(text, year) {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("官方 CSV 沒有資料列");
  const header = rows[0].map((value) => value.replace(/^\uFEFF/, ""));
  const dateIndex = header.findIndex((value) => /日期|date/i.test(value));
  const holidayIndex = header.findIndex((value) => /放假|holiday/i.test(value));
  const nameIndex = header.findIndex((value) => /節日|紀念日|名稱|name/i.test(value));
  if (dateIndex < 0 || holidayIndex < 0) throw new Error("官方 CSV 缺少日期或放假欄位");
  const seen = new Set();
  return rows.slice(1).filter((row) => row[dateIndex]).map((row) => {
    const date = normalizeDate(row[dateIndex], year);
    if (seen.has(date)) throw new Error(`官方 CSV 有重複日期：${date}`);
    seen.add(date);
    const holiday = row[holidayIndex] === "2";
    return { date, name: nameIndex >= 0 ? row[nameIndex] || "官方假日" : "官方假日", kind: holiday ? "holiday" : "makeup_workday" };
  });
}

async function main() {
  const { year, check } = args();
  const source = SOURCES[year];
  if (!source) throw new Error(`目前沒有設定 ${year} 的官方 CSV；請等官方公告後新增固定來源。`);
  const response = await fetch(source, { signal: AbortSignal.timeout(20_000), redirect: "error" });
  if (!response.ok) throw new Error(`官方資料下載失敗：HTTP ${response.status}`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > 2_000_000) throw new Error("官方 CSV 超過允許大小");
  const entries = normalizeOfficialCsv(await response.text(), year);
  const output = JSON.stringify({ year, source, retrievedAt: new Date().toISOString(), complete: entries.length >= 300, entries }, null, 2) + "\n";
  const target = resolve(CACHE_DIR, `${year}.json`);
  if (check) {
    let existing = "";
    try { existing = await readFile(target, "utf8"); } catch {}
    console.log(existing === output ? "資料一致" : "官方資料有更新或快取不存在");
    return;
  }
  await mkdir(dirname(target), { recursive: true });
  const temp = `${target}.tmp`;
  await writeFile(temp, output, "utf8");
  await rename(temp, target);
  console.log(`已更新 ${target}`);
}

if (import.meta.url === `file://${process.argv[1].replaceAll("\\", "/")}`) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
