"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type {
  ProfileIdentityBadge,
  ProfileIdentityBadgeCategory,
} from "@/services/profile/profile.service";

const MAX_VISIBLE_BADGES = 4;

type BadgePresentation = {
  tone: BadgeTone;
  style?: CSSProperties;
};

const categoryPresentation: Record<
  ProfileIdentityBadgeCategory,
  BadgePresentation
> = {
  "current-membership": { tone: "info" },
  "historical-membership": {
    tone: "info",
    style: {
      backgroundColor:
        "color-mix(in oklab, var(--primary) 7%, var(--surface-default))",
      borderColor:
        "color-mix(in oklab, var(--primary) 24%, var(--border-default))",
      color: "var(--primary-dark)",
    },
  },
  officer: { tone: "success" },
  "non-member": { tone: "neutral" },
};

type ProfileIdentityBadgesProps = {
  badges: ProfileIdentityBadge[];
};

export function ProfileIdentityBadges({
  badges,
}: ProfileIdentityBadgesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const disclosureId = useId();
  const visibleBadges = isExpanded
    ? badges
    : badges.slice(0, MAX_VISIBLE_BADGES);
  const hiddenBadges = badges.slice(MAX_VISIBLE_BADGES);

  if (badges.length === 0) return null;

  return (
    <div
      className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start"
      aria-label="社團身分標籤"
    >
      {visibleBadges.map((badge) => {
        const presentation = categoryPresentation[badge.category];

        return (
          <Badge
            key={badge.id}
            tone={presentation.tone}
            style={presentation.style}
          >
            {badge.label}
          </Badge>
        );
      })}
      {hiddenBadges.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={isExpanded}
          aria-controls={disclosureId}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="min-h-7 rounded-full border-(--border-muted) bg-(--surface-default) px-2.5 text-xs hover:bg-(--surface-subtle)"
        >
          {isExpanded ? "收合" : `+${hiddenBadges.length}`}
        </Button>
      ) : null}
      <span id={disclosureId} className="sr-only">
        {isExpanded ? "已顯示全部社團身分標籤" : "尚有更多社團身分標籤"}
      </span>
    </div>
  );
}
