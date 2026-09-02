export const CLUB_TIME_ZONE = "Asia/Taipei";

type DateTimeParts = Record<string, string>;

function getDateTimeParts(date: Date, timeZone = CLUB_TIME_ZONE): DateTimeParts {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  })
    .formatToParts(date)
    .reduce<DateTimeParts>(
      (result, part) => ({ ...result, [part.type]: part.value }),
      {},
    );
}

export function formatTaipeiDateTimeLocal(value: Date): string {
  const parts = getDateTimeParts(value);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function getFutureTaipeiDateTimeLocal(
  durationDays: number,
  now = new Date(),
): string {
  return formatTaipeiDateTimeLocal(
    new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000),
  );
}

export function parseTaipeiDateTimeLocal(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const wallTimeAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  const referenceParts = getDateTimeParts(new Date(wallTimeAsUtc));
  const offset = Date.UTC(
    Number(referenceParts.year),
    Number(referenceParts.month) - 1,
    Number(referenceParts.day),
    Number(referenceParts.hour),
    Number(referenceParts.minute),
  ) - wallTimeAsUtc;

  return new Date(wallTimeAsUtc - offset).toISOString();
}

function toValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(
  ...dateable: ConstructorParameters<typeof Date>
): string {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: CLUB_TIME_ZONE,
  }).format(new Date(...dateable));
}

export function formatDateTime(value: string | null | undefined): string {
  const date = toValidDate(value);
  if (!date) return "—";

  const parts = new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CLUB_TIME_ZONE,
  })
    .formatToParts(date)
    .reduce<Record<string, string>>(
      (result, part) => ({ ...result, [part.type]: part.value }),
      {},
    );

  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

export function formatTime(value: string | null | undefined): string {
  const date = toValidDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CLUB_TIME_ZONE,
  }).format(date);
}

/** @deprecated Use formatDateTime for member-facing date and time display. */
export const formatAdminDateTime = formatDateTime;

export type DueTimeState = "overdue" | "due-soon" | "later" | "unknown";

export type DueTimePresentation = {
  absolute: string | null;
  relative: string;
  state: DueTimeState;
};

export function getDueTimePresentation(
  dueAt: string | null | undefined,
  now = new Date(),
): DueTimePresentation {
  const dueDate = toValidDate(dueAt);
  if (!dueDate) {
    return {
      absolute: null,
      relative: "歸還期限待確認",
      state: "unknown",
    };
  }

  const differenceMs = dueDate.getTime() - now.getTime();
  const isOverdue = differenceMs < 0;
  const totalMinutes = Math.max(1, Math.ceil(Math.abs(differenceMs) / 60_000));
  const prefix = isOverdue ? "已逾期" : "剩餘";

  if (totalMinutes < 60) {
    return {
      absolute: formatDateTime(dueAt),
      relative: `${prefix} ${totalMinutes} 分鐘`,
      state: isOverdue ? "overdue" : "due-soon",
    };
  }

  const totalHours = Math.ceil(totalMinutes / 60);
  if (totalHours < 24) {
    return {
      absolute: formatDateTime(dueAt),
      relative: `${prefix} ${totalHours} 小時`,
      state: isOverdue ? "overdue" : "due-soon",
    };
  }

  const totalDays = Math.ceil(totalHours / 24);
  return {
    absolute: formatDateTime(dueAt),
    relative: isOverdue ? `已逾期 ${totalDays} 天` : `${totalDays} 天後到期`,
    state: isOverdue ? "overdue" : "later",
  };
}

export function formatRelativeTime(timestamp: string): string {
  const differenceMs = Date.now() - new Date(timestamp).getTime();
  const totalMinutes = Math.max(1, Math.ceil(Math.abs(differenceMs) / 60_000));
  if (totalMinutes < 60) return `${totalMinutes} 分鐘前`;
  const totalHours = Math.ceil(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours} 小時前`;
  return `${Math.ceil(totalHours / 24)} 天前`;
}
