# Design AI Handoff

## 背景

NTUST BGC 是臺科大桌上遊戲研究社的官方網站與社員管理系統。訪客需要了解社團、活動與桌遊；會員需要處理資格、簽到與借還；幹部需要管理活動、會員、內容與借還。

## 三個畫面目標

- **Homepage**：建立信任、說清楚社團、引導近期活動與探索。
- **Dashboard**：顯示會員狀態與待處理事項，縮短日常操作路徑。
- **Admin Overview**：以營運待辦為中心，讓幹部立即知道下一個要處理什麼。

## 必要區塊與順序

Homepage：Header → Hero → 近期活動 → 最新公告 → 熱門桌遊 → 探索 CTA → Footer。

Dashboard：標題 → 需要我處理 → 會員資格 → 簽到 → 借用 → 公告 → 快速操作。

Admin：Admin Header/Sidebar → 待處理總覽 → 近期活動 → 常用管理入口 → 有決策價值的統計。

## 視覺方向

簡潔、溫暖、具社團活動感，但不是遊戲產品的高噪音介面。使用既有 semantic token、Geist、圓角 Card、清楚的狀態色；保留足夠空白與文字層級。可自由發揮插圖、圖片裁切與卡片細節，但不得取代文字 CTA 或造成資訊密度過高。

## Mobile-first 要求

以 390px 單欄完成主要任務，按鈕可觸控、長標題可換行、沒有水平捲動。Desktop 1280px 只改為多欄排列，不改變區塊順序與主要操作。

## 已確定需求

- 使用現有 Site Settings branding／metadata。
- Public 不顯示 Draft 或 Admin metadata。
- Dashboard 需處理會員、簽到、借用狀態。
- Admin 需保留後端授權，前端隱藏不是安全邊界。
- Loading、Empty、Error 必須分開。

## 待決定選項

- 首頁近期活動是否加入（已有事件 service 但需確認最小公開查詢）。
- Dashboard 待處理摘要的優先排序文案。
- Admin 是否加入活動／會員 count，以及各 count 的更新頻率。

## 技術限制

不新增資料庫欄位、不複製 Calendar/CRUD、不把 Server Fetch 改成 Client-only、不硬編碼品牌或圖片 URL、不引入圖表套件。設計稿應展示：Homepage mobile/desktop、Dashboard 有資格與無資格兩種 mobile、Admin 有待辦與空狀態的 mobile/desktop。
