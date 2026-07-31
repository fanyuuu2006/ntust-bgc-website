export class EventNotFoundError extends Error {
  constructor() {
    super("找不到活動");
    this.name = "EventNotFoundError";
  }
}
