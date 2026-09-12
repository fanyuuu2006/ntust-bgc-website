# 錯誤追蹤與支援

使用者可複製隨機 UUID 追蹤碼（只複製畫面上的 UUID）；不包含網址、查詢參數、帳號、Email、token 或堆疊。剪貼簿失敗時可手動選取追蹤碼，重試不受影響。

## 收到追蹤碼

1. 開啟 Vercel 專案 Logs，選擇對應環境與時間區間，搜尋完整 UUID。
2. 查看匹配的 [UnexpectedError]：context、遮蔽動態片段的 route、method，以及安全的錯誤類型／代碼。
3. 必要時用本機測試資料重現。不要要求使用者提供密碼、Cookie、驗證連結或 token。

正式站須部署此變更後才會產生新追蹤碼。日誌保存範圍取決於方案，不保證固定天數。操作文件：https://vercel.com/docs/logs/runtime

## 開發契約

- 預期的 400／401／403／404／409／429 不建立事件。未知 API 錯誤由 server-response.ts 記錄並回傳 { message, errorId }；既有寄信失敗保留 503。
- apiClient 採用伺服器 ID；FormFeedback 從相容的訊息尾段顯示 ErrorReference，不建立第二個 ID。
- withServerErrorReference 保留 Next redirect／notFound；真正失敗先記錄，再用 app-error:<UUID> digest 傳到錯誤邊界。UI 只顯示 UUID，原生 Next digest 不直接當作支援碼。
- instrumentation 是未經應用邊界處理的後備記錄；已映射的 digest 不重複回報。框架／模組初始化等逃出包裝的錯誤，不能保證後備 client UUID 與 server ID 一致。
- Repository 只拋出帶 cause 的型別錯誤。reportUnexpectedError 使用欄位白名單，不記錄原始 message、stack、provider body 或 request；診斷細節刻意限制為安全類型與代碼。
- WeakMap 只對同一存活錯誤物件去重，不是事件儲存，不依賴跨 request 記憶體。
- 未設定 Sentry。Server console 可由 Vercel 收集；純瀏覽器 render／網路例外目前只寫瀏覽器 console，沒有遠端收集，不能保證可在 Vercel 查到。後續可在 reporting boundary 整合 provider，不讓功能直接依賴供應商。

## 本輪驗收限制

已用本機實際 Next.js 受控頁面及 API 驗證 500、ID 傳遞與日誌關聯；夾具已移除，沒有修改 production data。測試涵蓋剪貼簿成功／失敗、泛用訊息與重試。瀏覽器工具沒有可用頁面，未執行自動化視覺驗收；USER 已在 Phase 3C commit closure 前完成最終人工視覺驗收，接受目前 Error UX、複製與捲動行為。

## 開發環境診斷

NODE_ENV !== "production" 時，共用錯誤頁額外顯示類型、經篩選的訊息、可用的 code/context，以及可展開的 stack/cause 摘要；追蹤碼與安全支援複製仍保留。Stack trace 與 Cause 各有複製圖示，只複製該區顯示的內容。

伺服器只在非 production 將挑選、截長並遮蔽常見認證字串的診斷契約放入 Next 可傳遞的 error.message；不傳 arbitrary request/provider 物件。Production 在產生錯誤及渲染 UI 兩端都排除診斷資料，API 回應契約不變。文字遮蔽不能辨識所有未標記的機密，開發者仍不應將密碼／token 或 request body 組入 Error.message。

## 錯誤頁 UX 人工驗收

瀏覽器連接器未提供可用瀏覽器；USER 已完成最終人工驗收。以下保留為日後回歸檢查清單，結構測試不證明實際 overflow。請使用 localhost 的既有可重現錯誤，勿操作 production。

1. 在 1440×900 開啟錯誤頁，保持技術細節收合：確認錯誤訊息（例如 Buttn is not defined）比類型與追蹤碼醒目，Card 置中／留白合理。
2. 點「查看技術細節」：先把滑鼠移到 Card 外以滾輪上下捲動，確認 Card 頂端與「再試一次／回首頁」都可到達；再把滑鼠移到長 Stack 區，確認它能獨立捲動。使用至少 100 行的本機受控堆疊測試高度上限。
3. 用 Tab 聚焦 summary，Enter 展開／收合；Tab 進入技術區後用方向鍵捲動，再用 Tab 離開，確認焦點沒有被困住。
4. 在 375×812 與 320×568 重複收合／展開：確認訊息、UUID、長檔案字串會換行，頁面無水平位移，所有按鈕可見且可觸及；於 Card 外用觸控上下滑動，再在技術區內滑動。
5. 分別複製 Stack／Cause 與追蹤碼：各技術區只複製可見內容，追蹤碼只複製 UUID。確認 Copy 圖示切換為 Check，約 2.5 秒後復原，且不增加頁面高度。
6. 在 global 與 public／auth／authenticated／Admin 既有錯誤入口重複高內容測試；用 production-mode render 測試确认診斷區、message、stack、cause 均不存在。

佈局責任：GlobalError 的 body 覆寫基底固定高度為自動高度，主區域不收縮，以自動邊距處理短內容置中；route error 區域不收縮。一般 WebsiteShell／AdminShell 與全域 CSS 保持原狀。技術區使用有限高度的原生捲動區，文件本身保持自然高度。
