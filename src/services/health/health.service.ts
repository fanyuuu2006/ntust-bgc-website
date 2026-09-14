import "server-only";
import { healthRepository } from "@/repositories/health.repository";

export const healthService = {
  check: async (): Promise<{ app: "ok"; database: "ok" | "degraded" }> => {
    try {
      return { app: "ok", database: await healthRepository.probe() ? "ok" : "degraded" };
    } catch {
      // 健康狀態本身就是失敗訊號；不將 provider exception 或連線資訊回傳訪客。
      return { app: "ok", database: "degraded" };
    }
  },
};
