import { OfficerPositionWithAcademicYear } from "@/repositories/officer-positions.repository";

type OfficerCardProps = {
  officerPosition: OfficerPositionWithAcademicYear | null;
};

export function OfficerCard({ officerPosition }: OfficerCardProps) {
  return (
    <section
      className="card accent yellow p-6"
      aria-labelledby="officer-heading"
    >
      <h2
        id="officer-heading"
        className="mb-4 text-sm font-semibold text-(--muted)"
      >
        目前幹部
      </h2>

      {officerPosition ? (
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold text-(--foreground)">
            {officerPosition.title}
          </p>
          <p className="text-sm text-(--muted)">
            {officerPosition.academic_years.year} 學年度
          </p>
        </div>
      ) : (
        <p className="text-sm text-(--muted)">目前非幹部</p>
      )}
    </section>
  );
}
