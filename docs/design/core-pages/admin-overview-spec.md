# Admin Overview Specification

## Goal

讓幹部登入後先看到需要立即處理的營運工作，而不是只看到總數。每個數字都必須對應一個可執行的管理決策。

## 順序與區塊

1. **待處理總覽**（必要）：待審借用、已核准待交付、逾期借用、待處理活動／公告狀態；每項連至既有管理列表。
2. **近期活動**（建議）：顯示最近／即將開始的活動、草稿與取消狀態；沿用 Admin Events service，避免複製 Calendar。
3. **會員與內容捷徑**（必要）：會員資格、使用者、公告、評論、桌遊、Site Settings。
4. **營運統計**（次要）：桌遊總數、目前借出、會員狀態等；只保留能影響排程或處理順序的數字。
5. **系統狀態**（可選）：僅在已有安全健康資料來源時顯示，不自行加入假監控。

## 權限

Admin layout 與 Route Handler 仍是唯一權限邊界。Overview 的隱藏只改善體驗，不取代 API authorization。若未來有細分角色，區塊應由 server 傳入能力，不由 URL 或 client 判斷。

## Responsive

390px：待處理佇列先於統計，卡片單欄、每張提供一個主要操作。1280px：待處理 2～3 欄，近期活動與統計並列；側欄導覽仍維持現有 AdminShell。

## Wireframe

### Mobile 390px

```text
[Admin Header / menu]
[管理總覽 + 今日待處理 N]
[待處理]
  [待審借用 4] 查看
  [逾期借用 1] 查看
  [草稿活動 3] 查看
[近期活動]
[常用入口]
[營運統計（收合）]
```

### Desktop 1280px

```text
[Admin Header] [Sidebar]
[管理總覽 + 快速建立活動]
[待處理 3 欄：借用 | 活動 | 會員/公告]
[近期活動列表       | 重要統計]
[常用管理入口]
```

## Data／技術

目前已有 board-games service 的借用 count；活動、會員、公告的摘要查詢需確認是否可用既有 repository 的 bounded list/count。若沒有，新增 read-only service methods，不修改 schema。所有查詢需平行執行、限制筆數並避免每張卡片各自 query。
