import { Info } from "lucide-react";

import { BorrowBoardGameForm } from "@/components/(public)/board-games/BorrowBoardGameForm";
import { BOARD_GAME_STATUS_LABEL } from "@/components/(public)/board-games/BoardGameStatusBadge";
import { BorrowingStatusBadge } from "@/components/BorrowingStatusBadge";
import { ButtonLink } from "@/components/ui/Button";
import { clubPolicies } from "@/libs/clubPolicies";
import type { BoardGameBorrowing, BoardGameStatus } from "@/types/database";

type BoardGameBorrowingPanelProps = {
  status: BoardGameStatus;
  isAuthenticated: boolean;
  isCurrentAcademicYearMember: boolean;
  existingBorrowing: BoardGameBorrowing | null;
  boardGameId: string;
  boardGameName: string;
};

const panelClassName =
  "rounded-xl border border-(--border-default) bg-(--surface-default) p-4";

export function BoardGameBorrowingPanel({
  status,
  isAuthenticated,
  isCurrentAcademicYearMember,
  existingBorrowing,
  boardGameId,
  boardGameName,
}: BoardGameBorrowingPanelProps) {
  if (existingBorrowing) {
    return (
      <section
        aria-labelledby="borrowing-decision-title"
        className={panelClassName}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="borrowing-decision-title"
            className="text-base font-semibold text-(--text-primary)"
          >
            你的借用狀態
          </h2>
          <BorrowingStatusBadge status={existingBorrowing.status} />
        </div>
        <p className="mt-1.5 text-sm leading-6 text-(--text-muted)">
          {getExistingBorrowingMessage(existingBorrowing.status)}
        </p>
        <ButtonLink
          href="/borrowings"
          variant="text"
          size="sm"
          className="mt-2 px-0"
        >
          查看我的借用
        </ButtonLink>
      </section>
    );
  }

  if (status !== "available") {
    return (
      <section
        aria-labelledby="borrowing-decision-title"
        className={panelClassName}
      >
        <h2
          id="borrowing-decision-title"
          className="text-base font-semibold text-(--text-primary)"
        >
          目前無法借用
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-(--text-muted)">
          這款桌遊目前為「{BOARD_GAME_STATUS_LABEL[status]}」，暫時無法申請借用。
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section
        aria-labelledby="borrowing-decision-title"
        className={panelClassName}
      >
        <h2
          id="borrowing-decision-title"
          className="text-base font-semibold text-(--text-primary)"
        >
          想借這款桌遊？
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-(--text-muted)">
          登入後即可送出借用申請。
        </p>
        <ButtonLink
          href={`/login?returnTo=${encodeURIComponent(`/board-games/${boardGameId}`)}`}
          className="mt-3 w-full sm:w-auto"
        >
          登入後申請借用
        </ButtonLink>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="borrowing-decision-title"
      className={panelClassName}
    >
      <h2
        id="borrowing-decision-title"
        className="text-base font-semibold text-(--text-primary)"
      >
        申請借用
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-(--text-muted)">
        送出申請後，將由幹部確認借用安排。
      </p>
      {!isCurrentAcademicYearMember ? (
        <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-(--border-default) bg-(--surface-subtle) p-3 text-sm leading-6 text-(--text-secondary)">
          <Info
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-(--status-info)"
          />
          {clubPolicies.nonCurrentAcademicYearMemberBorrowingNotice}
        </p>
      ) : null}
      <div className="mt-3">
        <BorrowBoardGameForm
          boardGameId={boardGameId}
          boardGameName={boardGameName}
          showNonCurrentMemberNotice={!isCurrentAcademicYearMember}
        />
      </div>
    </section>
  );
}

function getExistingBorrowingMessage(status: BoardGameBorrowing["status"]) {
  if (status === "pending") return "借用申請正在等待幹部確認。";
  if (status === "approved") return "借用已核准，請等待幹部確認借出。";
  return "這款桌遊目前已在你的借用中。";
}
