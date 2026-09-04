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
};

function FootprintItem({ label, value, unit }: FootprintItemProps) {
  return (
    <div className="min-w-0 rounded-xl bg-(--surface-subtle) px-3 py-3 sm:px-4">
      <p className="text-xs font-medium text-(--text-muted)">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-(--text-primary) sm:text-xl">
        {value}
        {unit ? <span className="ml-1 text-sm font-medium">{unit}</span> : null}
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
        <h2
          id="club-footprint-title"
          className="text-lg font-bold text-(--text-primary)"
        >
          我的社團足跡
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FootprintItem label="累積借用桌遊" value={totalBorrowedCount} unit="次" />
          <FootprintItem label="本學年簽到" value={attendedCount} unit="次" />
          <div className="col-span-2 sm:col-span-1">
            <FootprintItem
              label="加入社團"
              value={joinedAcademicYear ?? "尚無社員紀錄"}
              unit={joinedAcademicYear ? "學年度" : undefined}
            />
          </div>
        </div>
      </Card>
    </section>
  );
}
