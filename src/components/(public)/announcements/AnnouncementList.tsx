import { AnnouncementRow } from "@/components/(public)/announcements/AnnouncementRow";
import type { Announcement } from "@/types/database";

type AnnouncementListProps = {
  announcements: Announcement[];
};

export function AnnouncementList({ announcements }: AnnouncementListProps) {
  return (
    <ul>
      {announcements.map((announcement) => (
        <li
          key={announcement.id}
          className="border-b border-(--border-muted)"
        >
          <AnnouncementRow
            announcement={announcement}
            density="default"
            headingLevel={2}
          />
        </li>
      ))}
    </ul>
  );
}
