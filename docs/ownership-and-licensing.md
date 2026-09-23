# Ownership and licensing

## 1. Purpose

本文件記錄本專案目前已知的 attribution、內容邊界與授權狀態，協助維護者、社團與 contributor 理解不同內容可能具有不同權利來源。這不是法律意見，也不取代針對特定權利或移轉安排取得的專業建議。

## 2. Website identity

本網站服務國立臺灣科技大學桌上遊戲研究社，並以該社團的官方網站與管理平台呈現。

主要網站開發與維護 attribution 為飯魚（<https://fanyu.vercel.app>）。網站服務對象、營運角色、技術維護與 source-code rights 是不同概念，不應由單一 Footer 文案推定其法律關係。

## 3. Source code

Git repository 公開代表 source code 可以被瀏覽，不等於一般重製、修改、散布、再授權或商業利用的許可。本專案目前沒有一般開放原始碼 LICENSE；source-code rights 仍取決於實際 authorship、既有或未來的 agreement，以及適用法律。

`package.json` 的 `UNLICENSED` 是 package metadata，用於表達本 package 未依一般套件授權方式發布，不是完整的法律 license，也不取代個別權利分析。

## 4. Contributor boundary

目前 Git history 可見 `Yorn90104` 與 `FanYu` 兩個 author name，兩者使用相同 Git email。現有紀錄沒有明確證據顯示另一位獨立主要 source author，但 Git identity 及 commit history 無法單獨證明真實身分、完整 authorship 或排除其他實際 contribution。

未來的實質外部 contribution 應在合併前確認 contributor 有權提交內容，並在必要時以書面確認使用與授權條件。這不構成對既有 contribution 的追溯式權利移轉。

## 5. Club content

下列內容與 source code 的授權狀態分開處理：

- 國立臺灣科技大學桌上遊戲研究社的名稱與識別
- 社團 logo 與相關視覺素材
- 公告、活動描述及社團製作的文字
- 社團照片、影音與其他活動素材

內容出現在 repository 或網站中，不代表其可依 source-code rules 任意重製或利用。其來源與權利歸屬應依素材逐項確認。

## 6. User-generated content

Reviews、個人頁面內容、上傳資料及其他使用者提交內容，與 project source code 分離。其處理受網站條款、隱私權政策、使用者與平台間的實際約定及適用法律約束。

## 7. Third-party material

Dependencies、Lucide icons、字型、嵌入媒體、桌遊圖片及其他外部 assets，依各自的 license 或服務條款使用。repository 的權利聲明不會取代第三方條款，也不會擴張本專案可授予的權利。

## 8. Infrastructure ownership and control

Git repository、deployment、database、transactional email、DNS／domain 及其他服務可能由不同帳號或組織控制。技術上的存取或控制權不等同著作權、商標權、資料權利或長期維護義務。相關文件不得記錄 credentials、account IDs 或其他私人識別資訊。

## 9. Future club handoff

若未來社團希望取得 source ownership transfer、獨立 deployment、infrastructure transfer、特定維護承諾或 exclusive rights，應另以清楚的書面 agreement 確認範圍、素材與資料邊界、移轉方式、責任及後續維護條件。本文件不預先決定該協議的內容。

## 10. Unresolved provenance

目前下列 tracked assets 的 Git history 可指出加入 repository 的 commit，但不足以證明原始作者、完整授權鏈或可再散布範圍：

| Asset | Current evidence | Status |
| --- | --- | --- |
| `public/images/logo.jpg` | 由既有 Git author 加入 repository | 需要確認 |
| `public/images/favicon.ico` | 與 metadata／favicon 變更一同加入 | 需要確認 |
| `public/images/home/hero.jpg` | 由既有 Git author 加入 repository | 需要確認 |
| 其他未來加入的圖片或媒體 | 應保留來源及授權紀錄 | 需要逐項確認 |
