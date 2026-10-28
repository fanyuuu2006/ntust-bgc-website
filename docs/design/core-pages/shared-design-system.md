# Shared Design System

## 元件策略

可直接重用：`PageHeader`、`Card`、`Button`／`ButtonLink`、`DashboardSectionHeader`、`EmptyState`（若頁面已有）、`WebsiteShell`、`AdminShell`、`Header`、`Footer`、既有 loading/error wrapper。功能元件重用：`HomeHeroPresentation`、`LatestAnnouncementsSection`、`PopularBoardGamesSection`、`DashboardMembershipSummary`、`DashboardBorrowingSummary`、`SelfCheckInEvents`。

需要調整而非重寫：各 summary card 的文案密度、狀態排序、空資料樣式與 section heading。建議新增的元件只限 page-level 組裝，例如 `DashboardAttentionSummary`、`AdminAttentionQueue`、`PublicUpcomingEventsPreview`；等資料契約確認後再建立。

## Responsive

採 mobile-first 單一 DOM：小螢幕單欄，`sm`／`lg` 只改 grid、gap、padding 與文字密度。互動順序不因 viewport 改變。所有主要按鈕維持至少 40～44px 觸控區，長標題使用可換行而非水平溢出。

## 視覺語言

沿用 `src/styles/globals.css` 的 semantic tokens：`--surface-*`、`--text-*`、`--interactive-*`、`--status-*`、`--border-*` 與既有 `Card` 陰影。維持 Geist 字型與 `zh-Hant`。不新增 dark mode 假設、不引入圖表套件。

## 狀態與無障礙

每個非同步 section 必須區分 loading、成功空資料與錯誤；Skeleton 只保留結構。標題使用 `aria-labelledby`，卡片 CTA 具體描述目的，鍵盤 focus 可見，Modal／Mobile menu 保持既有 focus return 與 Escape 行為。
