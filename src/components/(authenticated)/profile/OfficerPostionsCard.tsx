import { OfficerPositionWithAcademicYear } from "@/services/users/users.types";

type OfficerPositionsCardProps = {
  officerPositions: OfficerPositionWithAcademicYear[];
};

/**
 * 顯示使用者「目前」所有幹部職位（同一學年度可能兼任多個職位）。
 *
 * 注意：先前版本的 props 型別為陣列，但解構卻取用不存在的
 * `officerPosition`（單數），導致畫面永遠顯示「目前非幹部」。
 * 這裡修正為改用陣列並逐筆渲染。
 */
export function OfficerPositionsCard({
  officerPositions,
}: OfficerPositionsCardProps) {
  return (
    <div className="card rounded-2xl accent yellow p-6" aria-labelledby="officer-heading">
      <h2
        id="officer-heading"
        className="mb-4 text-sm font-semibold text-(--muted)"
      >
        目前幹部
      </h2>

      {officerPositions.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {officerPositions.map((position) => (
            <li key={position.id} className="flex flex-col gap-1">
              <p className="text-lg font-bold text-(--foreground)">
                {position.title}
              </p>
              <p className="text-sm text-(--muted)">
                {position.academic_year.year} 學年度
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-(--muted)">目前非幹部</p>
      )}
    </div>
  );
}
