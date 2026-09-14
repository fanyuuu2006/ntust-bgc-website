# 社課當日操作手冊

本手冊不代表新 application 已部署。先核對 Vercel production source SHA；尚未包含 B3 的 deployment 沒有新 health endpoint 或減量效果。S1 compatibility schema 已套用，但新 app／legacy session invalidation／cleanup 是不同授權步驟，不要在現場排錯時順手執行。

## 社課前 30 分鐘

- 指定一位操作人員與一位現場聯絡人，準備限制存取的人工簽到名單。
- 確認 Vercel 正在服務的 deployment 狀態、source SHA、最近是否部署失敗；不要臨時 promote 未驗收版本。
- 開啟首頁，確認公告／桌遊 section 正常或有局部 unavailable 訊息。
- 用已授權的測試帳號完成註冊、驗證信接收、驗證連結與登入。不要留下未授權假社員或假借用紀錄。
- dashboard refresh、profile、settings 檢查保持登入；管理員開啟當日活動 detail，核對名稱、活動時間、簽到起訖與需要的社員資格。
- 由一名實際參與且具當學年度 active membership 的使用者簽到一次，確認成功後刷新顯示已簽到；核對 Admin event detail 名單。不為 smoke 建立大量 production fixture。
- 查看 Supabase API status、Database resource reports／連線／CPU／記憶體指標與 Vercel runtime errors，記錄時間範圍。
- 若已部署 health endpoint，只檢查一次 `GET /api/health`。期待 `app: ok, database: ok`；HTTP 200 本身不代表 DB 健康，必須讀 database 值。404 可能是 production 尚未包含此版本，不可直接判定 DB 掛掉。

## 現場大量錯誤

不要請所有人反覆 refresh 或連按簽到。先暫停重送，改由一位操作人員檢查：

1. `/api/health`（若該 deployment 有）：ok/degraded；timeout 或非 JSON 也記錄。避免高頻輪詢。
2. Vercel：目前 deployment、平台狀態、function timeout／runtime failure；核對 incident 的時間。
3. Supabase：Project/API 狀態與官方服務狀態。
4. Database resource reports：同時段 CPU、記憶體、連線與尖峰，不直接把免費方案或某 view 當根因。
5. 收集安全 Error ID、route、method、時間；查看對應 server operation、safe code/status。不要貼 Cookie、Authorization、token、hash、Email、完整含 query values 的 provider URL。
6. 區分 HTTP 500（application/configuration）、502/503/504（gateway/unavailable/timeout），同時核對實際 upstream evidence；不能只靠狀態碼判斷根因。PGRST303 的 timing metadata 另記，不能假裝 Session 不存在而要求全員登出。

不要即時修改 DB schema、重設金鑰、撤銷所有 Session，或對 POST 加 retry。unknown root cause 就記錄 inconclusive。

## 簽到人工 fallback

使用只有指定幹部可存取的紙本或受限檔案，不使用公開試算表。只記對帳必要資訊：

| 必要識別 | 到場時間（臺北時間） | 備註 |
| --- | --- | --- |
| 可對應帳號的識別；必要時學號 | 實際到場時間 | 例如系統不可用、待確認社員資格 |

不要收集密碼、Cookie、Session token 或不必要聯絡資料。先記錄到場，不擅自承諾系統簽到资格已通過。

系統恢復後由管理員核對帳號、活動、當學年度資格與既有簽到，去重後透過現有 Admin attendance 流程補登實際時間；保留原本已成功紀錄，不直接批次插 SQL。完成對帳後限制後續使用，依社團必要保存規則處理人工名單，不任意轉傳。

## 恢復確認

由操作人員單次測試 login/dashboard/check-in/admin detail，確認權威 attendance 狀態後再通知大家恢復操作。已收到 409 的人先查看「已簽到」狀態，避免重複送出。將時間、影響範圍、Error IDs、處理與未確認事項記錄在 sanitized incident document。
