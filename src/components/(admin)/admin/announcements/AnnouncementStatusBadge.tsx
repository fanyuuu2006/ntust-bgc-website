import { Badge } from "@/components/ui/Badge";
export function AnnouncementStatusBadge({ published }: { published: boolean }) { return <Badge tone={published ? "success" : "neutral"}>{published ? "已發布" : "草稿"}</Badge>; }
