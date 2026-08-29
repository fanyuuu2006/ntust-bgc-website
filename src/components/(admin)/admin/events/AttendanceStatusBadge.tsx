import type { AttendanceStatus } from "@/types/database";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

const ATTENDANCE_STATUS: Record<
  AttendanceStatus,
  { label: string; tone: BadgeTone }
> = {
  present: { label: "已到", tone: "success" },
  late: { label: "遲到", tone: "warning" },
  absent: { label: "缺席", tone: "danger" },
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: ATTENDANCE_STATUS.present.label,
  late: ATTENDANCE_STATUS.late.label,
  absent: ATTENDANCE_STATUS.absent.label,
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const { label, tone } = ATTENDANCE_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
