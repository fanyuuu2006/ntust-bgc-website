import { HeadingSection } from "@/components/(admin)/admin/HeadingSection";
import { MasterDataManager } from "@/components/(admin)/admin/master-data/MasterDataManager";
import { boardGamesService } from "@/services/board-games/board-games.service";

export default async function BoardGameLocationsPage() {
  const locations = await boardGamesService.listLocations();
  const items = await Promise.all(locations.map(async (location) => ({ ...location, count: await boardGamesService.countBoardGamesByLocationId(location.id) })));
  return <><HeadingSection title="桌遊位置管理" description="維護社產存放位置；仍有社產使用的位置不可刪除。" /><section className="px-4 pb-6"><MasterDataManager title="桌遊位置" singular="桌遊位置" endpoint="/api/admin/board-game-locations" items={items} /></section></>;
}
