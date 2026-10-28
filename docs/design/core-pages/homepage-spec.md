# Public Homepage Specification

## Goal

讓第一次訪客在手機上於幾秒內理解「這是什麼社團」、看到近期可參與的內容，並能前往行事曆、桌遊與加入／登入流程。

## 順序與區塊

1. **Hero**（必要）：使用 `HomeHero`／`HomeHeroPresentation` 與 Site Settings 的名稱、標語、圖片；主 CTA 為「查看近期活動」，次 CTA 為「瀏覽桌遊」或登入／加入。
2. **近期活動摘要**（建議）：只顯示 Published 的近期活動，取消活動明確標示；資料應重用 Public Events service，最多 3 筆，完整列表導向 `/schedule`。
3. **最新公告**（必要）：沿用 `LatestAnnouncementsSection`，成功空資料與錯誤分開呈現。
4. **熱門桌遊**（建議）：沿用 `PopularBoardGamesSection`，顯示有限數量並導向 `/board-games`。
5. **探索入口**（建議）：以 2～3 個文字 CTA 連至行事曆、排行榜、如何加入，不做功能卡片牆。
6. **Footer**（必要）：沿用 Site Settings branding、公開導覽與法律連結。

## Responsive

390px：單欄，Hero CTA 全寬或自然換行；活動列表先時間再名稱；探索入口垂直排列。1280px：同一順序，Hero 內容與圖片左右分欄，活動與公告可形成兩欄，但仍保持同一 DOM 資訊層級。

## Loading／Empty／Error

Hero 由 Server 取得設定，不顯示假內容。動態摘要使用既有 Suspense skeleton；API 失敗顯示簡短錯誤與「前往完整頁面」而非空陣列。成功但無活動／公告才顯示 Empty。圖片使用既有 Media URL 與預設 fallback。

## Interaction

所有 CTA 使用可讀 accessible name、鍵盤 focus ring 與 44px 觸控區。活動摘要點擊進 `/schedule` 或公開詳情；不在首頁複製 Calendar CRUD。

## Data／技術

已有：Site Settings、Announcements preview、Popular board games、Metadata。需確認／可能新增：Public events preview service 或在既有 API 增加受限 limit；不需要 schema migration。若同時查詢三個區塊，Server Component 應 `Promise.all`，並設定合理 cache/tag。

## Wireframe

### Mobile 390px

```text
[Header / logo / menu]
[Hero image]
[社團一句話]
[查看近期活動] [瀏覽桌遊]
[近期活動 1..3] -> 查看全部
[最新公告] -> 查看全部
[熱門桌遊 2 欄]
[行事曆 | 排行榜 | 如何加入]
[Footer]
```

### Desktop 1280px

```text
[Header ------------------------------------------------]
[Hero: copy + CTA              image                  ]
[近期活動 3 筆      | 最新公告 3 筆                 ]
[熱門桌遊 6 張                                      ]
[探索入口：行事曆 / 排行榜 / 加入社團               ]
[Footer ------------------------------------------------]
```
