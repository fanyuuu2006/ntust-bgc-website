import type { LucideIcon } from "lucide-react";
import { CalendarCheck2, Dice5, Footprints, UsersRound } from "lucide-react";
import { Card } from "@/components/ui/Card";

type ProfileClubFootprintProps = {
  totalBorrowedCount: number;
  attendedCount: number;
  joinedAcademicYear: string | null;
};

type FootprintItemProps = {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  accent: string;
};

function FootprintItem({ label, value, unit, icon: Icon, accent }: FootprintItemProps) {
  return (
    <div
      className="min-w-0 rounded-xl border px-3 py-3 sm:px-4"
      style={{
        backgroundColor: `color-mix(in oklab, ${accent} 7%, var(--surface-subtle))`,
        borderColor: `color-mix(in oklab, ${accent} 18%, var(--border-muted))`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className="size-4 shrink-0" style={{ color: accent }} />
        <p className="text-xs font-medium text-(--text-secondary)">{label}</p>
      </div>
      <p className="mt-2 break-words text-lg font-bold tabular-nums text-(--text-primary) sm:text-xl">
        {value}
        {unit ? <span className="ml-1 text-sm font-medium text-(--text-secondary)">{unit}</span> : null}
      </p>
    </div>
  );
}

export function ProfileClubFootprint({
  totalBorrowedCount,
  attendedCount,
  joinedAcademicYear,
}: ProfileClubFootprintProps) {
  return (
    <section aria-labelledby="club-footprint-title">
      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Footprints aria-hidden="true" className="size-5 text-(--interactive-primary)" />
          <h2
            id="club-footprint-title"
            className="text-lg font-bold text-(--text-primary)"
          >
            我的社團足跡
          </h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FootprintItem
            label="累積借用桌遊"
            value={totalBorrowedCount}
            unit="次"
            icon={Dice5}
            accent="var(--status-info)"
          />
          <FootprintItem
            label="本學年簽到"
            value={attendedCount}
            unit="次"
            icon={CalendarCheck2}
            accent="var(--status-success)"
          />
          <div className="col-span-2 sm:col-span-1">
            <FootprintItem
              label="加入社團"
              value={joinedAcademicYear ?? "尚無社員紀錄"}
              unit={joinedAcademicYear ? "學年度" : undefined}
              icon={UsersRound}
              accent="var(--status-warning)"
            />
          </div>
        </div>
      </Card>
    </section>
  );
}
