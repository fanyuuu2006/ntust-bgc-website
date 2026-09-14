import type { ReactNode } from "react";

/** 共用 Profile 的表面與色帶；身份內容由各頁組裝，避免公開版接收私人資料。 */
export function ProfileHeroSurface({ children }: { children: ReactNode }) {
  return (
    <div
      className="card relative overflow-hidden rounded-2xl p-5 sm:p-7 lg:p-8"
      style={{
        backgroundImage:
          "linear-gradient(135deg, color-mix(in oklab, var(--primary) 5%, transparent), transparent 45%), linear-gradient(315deg, color-mix(in oklab, var(--status-success) 4%, transparent), transparent 38%)",
      }}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-(--primary) via-(--game-blue) to-(--game-green)" />
      {children}
    </div>
  );
}
