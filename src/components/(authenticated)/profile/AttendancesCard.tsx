import type { EventAttendance } from "@/types/database";

type AttendanceCardProps = {
  attendances: EventAttendance[];
};

/**
 * 活動出席資料尚未有 repository/service（規劃中功能），理由同 BorrowingCard。
 */
export function AttendanceCard({ attendances }: AttendanceCardProps) {
  return (
    <section className="card p-6" aria-labelledby="attendance-heading">
      <h2
        id="attendance-heading"
        className="mb-4 text-sm font-semibold text-(--muted)"
      >
        最近活動
      </h2>

      {attendances.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {attendances.map((attendance) => (
            <li key={attendance.id} className="text-sm text-(--foreground)">
              {attendance.status}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-(--muted)">尚無活動紀錄</p>
      )}
    </section>
  );
}
