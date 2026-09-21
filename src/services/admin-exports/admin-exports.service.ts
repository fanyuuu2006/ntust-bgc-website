import "server-only";

import { z } from "zod";
import { ADMIN_EXPORT_ROW_LIMIT, ExportRowLimitExceededError } from "@/libs/export/export";
import type { ExportColumn, ExportDocument, ExportPrimitive } from "@/libs/export/types";
import { readSingleQueryValue } from "@/libs/query-params";
import { usersService } from "@/services/users/users.service";
import { membershipService } from "@/services/memberships/memberships.service";
import { listAdminMembershipsQuerySchema } from "@/services/memberships/memberships.schema";
import { officerPositionsService } from "@/services/officer-positions/officer-positions.service";
import { boardGamesService } from "@/services/board-games/board-games.service";
import { listAdminBoardGamesQuerySchema, listBorrowingsQuerySchema } from "@/services/board-games/board-games.schema";
import { eventsService } from "@/services/events/events.service";

export const ADMIN_EXPORT_DOMAINS = ["users", "memberships", "officers", "board-games", "borrowings", "event-attendance"] as const;
export type AdminExportDomain = (typeof ADMIN_EXPORT_DOMAINS)[number];
type Row = Record<string, ExportPrimitive>;
type Document = ExportDocument<Row>;
type RawQuery = Record<string, string | string[] | undefined>;

const membershipTypeLabels = { annual: "一般社員", lifetime: "終生社員" } as const;
const membershipStatusLabels = { pending: "待處理", active: "有效", expired: "已到期", suspended: "停權", cancelled: "已取消" } as const;
const boardGameStatusLabels = { available: "可借用", borrowed: "借出中", maintenance: "維護中", lost: "遺失", damaged: "損壞", retired: "已退役" } as const;
const borrowingStatusLabels = { pending: "待審核", approved: "已核准", rejected: "已拒絕", borrowed: "借出中", returned: "已歸還", cancelled: "已取消" } as const;
const attendanceStatusLabels = { present: "出席", late: "遲到", absent: "缺席" } as const;

function columns<RowType extends Row>(items: readonly ExportColumn<RowType>[]): readonly ExportColumn<Row>[] {
  return items as readonly ExportColumn<Row>[];
}

function assertWithinLimit(total: number) {
  if (total > ADMIN_EXPORT_ROW_LIMIT) throw new ExportRowLimitExceededError(total);
}

function filtersOf(values: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => key !== "page" && key !== "pageSize" && value !== undefined && value !== "" && value !== null)) as Record<string, string | number | boolean>;
}

async function usersDocument(query: RawQuery): Promise<Document> {
  const search = readSingleQueryValue(query.search)?.trim() || undefined;
  const verificationValue = readSingleQueryValue(query.emailVerification);
  const emailVerification = verificationValue === "verified" || verificationValue === "unverified" ? verificationValue : undefined;
  const orderByValue = readSingleQueryValue(query.orderBy);
  const orderBy = (["name", "created_at"] as const).includes(orderByValue as "name" | "created_at") ? orderByValue as "name" | "created_at" : "created_at";
  const orderDirection = readSingleQueryValue(query.orderDirection) === "asc" ? "asc" : "desc";
  const result = await usersService.listForAdmin({ page: 1, pageSize: ADMIN_EXPORT_ROW_LIMIT, maxPageSize: ADMIN_EXPORT_ROW_LIMIT, search, emailVerification, orderBy, orderDirection });
  assertWithinLimit(result.total);
  return {
    domain: "users", filenameBase: "users", worksheetName: "使用者", filters: filtersOf({ search, emailVerification, orderBy, orderDirection }),
    columns: columns([
      { key: "id", header: "使用者 ID", width: 38 }, { key: "username", header: "使用者名稱", width: 24 },
      { key: "realName", header: "真實姓名", width: 18 }, { key: "studentId", header: "學號", width: 16 },
      { key: "email", header: "Email", width: 30 }, { key: "accountState", header: "帳號狀態", width: 12 },
      { key: "verificationState", header: "Email 驗證", width: 14 }, { key: "createdAt", header: "建立時間", kind: "instant", width: 20 },
    ] as const),
    rows: result.data.map((user) => ({ id: user.id, username: user.name, realName: user.closed_at ? null : user.profile?.real_name ?? null, studentId: user.closed_at ? null : user.profile?.student_id ?? null, email: user.closed_at ? null : user.email, accountState: user.closed_at ? "已註銷" : "開啟", verificationState: user.email_verified_at ? "已驗證" : "未驗證", createdAt: user.created_at })),
  };
}

async function membershipsDocument(query: RawQuery): Promise<Document> {
  const parsed = listAdminMembershipsQuerySchema.parse(query);
  const result = await membershipService.listAdminMemberships({ ...parsed, page: 1, pageSize: ADMIN_EXPORT_ROW_LIMIT, maxPageSize: ADMIN_EXPORT_ROW_LIMIT });
  assertWithinLimit(result.total);
  return {
    domain: "memberships", filenameBase: parsed.academic_year_id ? "memberships-filtered" : "memberships", worksheetName: "社員資格", filters: filtersOf(parsed),
    columns: columns([
      { key: "id", header: "社員資格 ID", width: 38 }, { key: "academicYear", header: "學年度", width: 12 },
      { key: "realName", header: "真實姓名", width: 18 }, { key: "username", header: "使用者名稱", width: 24 },
      { key: "studentId", header: "學號", width: 16 }, { key: "typeCode", header: "資格類型代碼", width: 16 },
      { key: "typeLabel", header: "資格類型", width: 14 }, { key: "statusCode", header: "狀態代碼", width: 14 },
      { key: "statusLabel", header: "狀態", width: 12 }, { key: "joinedAt", header: "加入時間", kind: "instant", width: 20 },
      { key: "createdAt", header: "建立時間", kind: "instant", width: 20 },
    ] as const),
    rows: result.data.map((item) => ({ id: item.id, academicYear: item.academic_year?.year ?? null, realName: item.user.closed_at ? null : item.user_profile?.real_name ?? null, username: item.user.closed_at ? "已註銷使用者" : item.user.name, studentId: item.user.closed_at ? null : item.user_profile?.student_id ?? null, typeCode: item.type, typeLabel: membershipTypeLabels[item.type], statusCode: item.status, statusLabel: membershipStatusLabels[item.status], joinedAt: item.joined_at, createdAt: item.created_at })),
  };
}

async function officersDocument(query: RawQuery): Promise<Document> {
  const search = readSingleQueryValue(query.search)?.trim() || undefined;
  const academicYearCandidate = readSingleQueryValue(query.academicYearId);
  const academicYearId = z.uuid().safeParse(academicYearCandidate).success ? academicYearCandidate : undefined;
  const result = await officerPositionsService.listForAdmin({ page: 1, pageSize: ADMIN_EXPORT_ROW_LIMIT, maxPageSize: ADMIN_EXPORT_ROW_LIMIT, search, academicYearId });
  assertWithinLimit(result.total);
  return {
    domain: "officers", filenameBase: "officers", worksheetName: "幹部職位", filters: filtersOf({ search, academicYearId }),
    columns: columns([
      { key: "id", header: "職位 ID", width: 38 }, { key: "academicYear", header: "學年度", width: 12 },
      { key: "title", header: "職稱", width: 24 }, { key: "realName", header: "真實姓名", width: 18 },
      { key: "username", header: "使用者名稱", width: 24 }, { key: "studentId", header: "學號", width: 16 },
      { key: "createdAt", header: "建立時間", kind: "instant", width: 20 },
    ] as const),
    rows: result.data.map((item) => ({ id: item.id, academicYear: item.academic_year?.year ?? null, title: item.title, realName: item.user.closed_at ? null : item.user_profile?.real_name ?? null, username: item.user.closed_at ? "已註銷使用者" : item.user.name, studentId: item.user.closed_at ? null : item.user_profile?.student_id ?? null, createdAt: item.created_at })),
  };
}

async function boardGamesDocument(query: RawQuery): Promise<Document> {
  const parsed = listAdminBoardGamesQuerySchema.parse(query);
  const result = await boardGamesService.listAdminBoardGamesWithCategoryAndLocation({ page: 1, pageSize: ADMIN_EXPORT_ROW_LIMIT, maxPageSize: ADMIN_EXPORT_ROW_LIMIT, search: parsed.search, status: parsed.status, categoryId: parsed.category, locationId: parsed.location, orderBy: parsed.orderBy, orderDirection: parsed.orderDirection });
  assertWithinLimit(result.total);
  return {
    domain: "board-games", filenameBase: "board-games", worksheetName: "桌遊社產", filters: filtersOf(parsed),
    columns: columns([
      { key: "id", header: "桌遊 ID", width: 38 }, { key: "inventoryNumber", header: "社產編號", kind: "number", width: 14 },
      { key: "name", header: "桌遊名稱", width: 30 }, { key: "category", header: "種類", width: 18 },
      { key: "location", header: "位置", width: 18 }, { key: "statusCode", header: "狀態代碼", width: 14 },
      { key: "statusLabel", header: "狀態", width: 12 }, { key: "createdAt", header: "建立時間", kind: "instant", width: 20 },
      { key: "updatedAt", header: "更新時間", kind: "instant", width: 20 },
    ] as const),
    rows: result.data.map((item) => ({ id: item.id, inventoryNumber: item.inventory_number, name: item.name, category: item.category?.name ?? null, location: item.location?.name ?? null, statusCode: item.status, statusLabel: boardGameStatusLabels[item.status], createdAt: item.created_at, updatedAt: item.updated_at })),
  };
}

async function borrowingsDocument(query: RawQuery): Promise<Document> {
  const parsed = listBorrowingsQuerySchema.parse(query);
  const result = await boardGamesService.listBorrowings({ ...parsed, page: 1, pageSize: ADMIN_EXPORT_ROW_LIMIT, maxPageSize: ADMIN_EXPORT_ROW_LIMIT });
  assertWithinLimit(result.total);
  return {
    domain: "borrowings", filenameBase: "borrowings", worksheetName: "桌遊借用", filters: filtersOf(parsed),
    columns: columns([
      { key: "id", header: "借用 ID", kind: "number", width: 14 }, { key: "boardGame", header: "桌遊名稱", width: 28 },
      { key: "inventoryNumber", header: "社產編號", kind: "number", width: 14 }, { key: "realName", header: "借用者真實姓名", width: 18 },
      { key: "username", header: "借用者使用者名稱", width: 24 }, { key: "studentId", header: "借用者學號", width: 16 },
      { key: "statusCode", header: "狀態代碼", width: 14 }, { key: "statusLabel", header: "狀態", width: 12 },
      { key: "requestedAt", header: "申請時間", kind: "instant", width: 20 }, { key: "approvedAt", header: "核准時間", kind: "instant", width: 20 },
      { key: "rejectedAt", header: "拒絕時間", kind: "instant", width: 20 }, { key: "cancelledAt", header: "取消時間", kind: "instant", width: 20 },
      { key: "borrowedAt", header: "借出時間", kind: "instant", width: 20 }, { key: "dueAt", header: "應歸還時間", kind: "instant", width: 20 },
      { key: "returnedAt", header: "歸還時間", kind: "instant", width: 20 }, { key: "approvedBy", header: "核准者使用者名稱", width: 24 },
    ] as const),
    rows: result.data.map((item) => ({ id: item.id, boardGame: item.board_game.name, inventoryNumber: item.board_game.inventory_number, realName: item.user.closed_at ? null : item.user_profile?.real_name ?? null, username: item.user.closed_at ? "已註銷使用者" : item.user.name, studentId: item.user.closed_at ? null : item.user_profile?.student_id ?? null, statusCode: item.status, statusLabel: borrowingStatusLabels[item.status], requestedAt: item.created_at, approvedAt: item.approved_at, rejectedAt: item.rejected_at, cancelledAt: item.cancelled_at, borrowedAt: item.borrowed_at, dueAt: item.due_at, returnedAt: item.returned_at, approvedBy: item.approved_by_user?.name ?? null })),
  };
}

async function attendanceDocument(query: RawQuery): Promise<Document> {
  const eventId = z.uuid().parse(readSingleQueryValue(query.eventId));
  const search = readSingleQueryValue(query.search)?.trim() || undefined;
  const orderDirection = readSingleQueryValue(query.orderDirection) === "asc" ? "asc" : "desc";
  const [event, result] = await Promise.all([eventsService.getEventById(eventId), eventsService.listAttendancesForAdmin(eventId, { page: 1, pageSize: ADMIN_EXPORT_ROW_LIMIT, maxPageSize: ADMIN_EXPORT_ROW_LIMIT, search, orderDirection })]);
  if (!event) throw new Error("Event not found");
  assertWithinLimit(result.total);
  return {
    domain: "event-attendance", filenameBase: `event-attendance-${eventId}`, worksheetName: "活動簽到", filters: filtersOf({ eventId, search, orderDirection }),
    columns: columns([
      { key: "eventId", header: "活動 ID", width: 38 }, { key: "eventName", header: "活動名稱", width: 30 },
      { key: "attendanceId", header: "簽到 ID", kind: "number", width: 14 }, { key: "realName", header: "真實姓名", width: 18 },
      { key: "username", header: "使用者名稱", width: 24 }, { key: "studentId", header: "學號", width: 16 },
      { key: "statusCode", header: "簽到狀態代碼", width: 16 }, { key: "statusLabel", header: "簽到狀態", width: 14 },
      { key: "attendedAt", header: "簽到時間", kind: "instant", width: 20 },
    ] as const),
    rows: result.data.map((item) => ({ eventId, eventName: event.name, attendanceId: item.id, realName: item.user.closed_at ? null : item.profile?.real_name ?? null, username: item.user.closed_at ? "已註銷使用者" : item.user.name, studentId: item.user.closed_at ? null : item.profile?.student_id ?? null, statusCode: item.status, statusLabel: attendanceStatusLabels[item.status], attendedAt: item.attended_at })),
  };
}

export const adminExportsService = {
  createDocument: async (domain: AdminExportDomain, query: RawQuery): Promise<Document> => {
    switch (domain) {
      case "users": return usersDocument(query);
      case "memberships": return membershipsDocument(query);
      case "officers": return officersDocument(query);
      case "board-games": return boardGamesDocument(query);
      case "borrowings": return borrowingsDocument(query);
      case "event-attendance": return attendanceDocument(query);
    }
  },
};
