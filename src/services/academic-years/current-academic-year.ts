import "server-only";
import { cache } from "react";
import { academicYearsRepository } from "@/repositories/academic-years.repository";

/**
 * 同一次 Server Component render 共用目前學年度（包含進行中的查詢）。
 * 不使用跨 request 的資料快取，避免年度切換後沿用舊的授權依據。
 * Route Handler 沒有 React render dispatcher，因此不做 memo；
 * 簽到 API 目前只呼叫一次，仍會向資料庫取得當次資格所需的年度。
 */
export const getCurrentAcademicYear = cache(() => academicYearsRepository.findCurrent());
