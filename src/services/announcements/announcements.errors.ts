export class AnnouncementNotFoundError extends Error {
  constructor() {
    super("找不到公告");
    this.name = "AnnouncementNotFoundError";
  }
}
