"use client";

import { useId, useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type {
  ProfileIdentityBadge,
  ProfileIdentityBadgeCategory,
} from "@/services/profile/profile.service";

const MAX_VISIBLE_BADGES = 4;

const categoryTone: Record<ProfileIdentityBadgeCategory, BadgeTone> = {
  "current-membership": "info",
  "historical-membership": "neutral",
  officer: "success",
  "non-member": "neutral",
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
      {visibleBadges.map((badge) => (
        <Badge key={badge.id} tone={categoryTone[badge.category]}>
          {badge.label}
        </Badge>
      ))}
      {hiddenBadges.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={isExpanded}
          aria-controls={disclosureId}
          onClick={() => setIsExpanded((expanded) => !expanded)}
          className="min-h-7 rounded-full px-2 text-xs"
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
