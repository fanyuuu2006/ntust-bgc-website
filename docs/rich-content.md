# 公告 Rich Content

## React 與資料流（Phase 3E-UX）

我們的 `RichTextEditor` 是 **React Functional Component**，不是 React Class Component。
`useEditor()` 建立／維護 Tiptap 的 `Editor` instance；它是管理 ProseMirror 文件、選取、
commands 與 undo history 的 imperative 物件，不是 React component。
套件內的 `PureEditorContent extends React.Component` 是 Tiptap 的 React DOM adapter，
負責掛載編輯 DOM／node views；不需要因為它使用 class 而改寫第三方套件。

- `useState`：連結表單 UI；父表單保存待送出的 JSON。
- `useEditorState`：訂閱文件與 selection transactions，讓游標移動也能更新 active/disabled。
- `useRef`／`useEffect`：開啟 URL 欄位時移入焦點，以及同步 editor 可編輯狀態。
- `immediatelyRender: false`：Next.js hydration 後才建立編輯 DOM；只初始化一次內容，
  不用每次 toolbar render 或儲存失敗重新載入文件。

```text
Admin RichTextEditor（React FC）
  → Tiptap Editor / ProseMirror document
  → onUpdate → canonicalEditorContent（投影，尚未信任）
  → AnnouncementEditor 的 React state
  → client schema 檢查 → POST/PATCH API
  → Admin 授權 → Service schema 再驗證
  → canonical rich_content + server 衍生的 content
  → Repository → DB

Public:
rich_content + content_format
  → readRichContent 驗證（失敗回退 escaped companion）
  → RichTextRenderer → semantic React elements → SSR HTML

Search / cards / SEO:
server 衍生的 content / plain-text extractor
```

工具列命令先 `.focus()` 恢復 editor 的選取，再執行格式操作。滑鼠按下工具列按鈕時
阻止預設焦點轉移，避免 DOM selection 被收合；鍵盤仍透過正常 click 操作。
連結輸入取得 DOM focus 時，ProseMirror 保留 selection；套用時恢復該 selection，
若在既有連結內，`extendMarkRange("link")` 更新整個連結。沒有使用 `window.prompt()`。

## 本輪功能證據與視覺決策

新測試使用 **真實 Tiptap＋React DOM＋jsdom 27.4.0**，不是以假 JSON 模擬命令。
jsdom 是 devDependency（相容目前 Node 22.14），不增加 production editor 功能。
測試 loader 統一使用同一 CommonJS ProseMirror instance，避免混用 ESM/CJS 的測試假性
duplicate keyed plugin 錯誤。jsdom 不具 layout engine，不可拿它證明視覺或 overflow PASS。

修正前 commands、active state、JSON、semantic DOM 與序列化重載已通過。
尚未重現「命令未執行／marks 儲存遺失」；可確認的問題是 active 只由 ghost 變 outline，
視覺辨識弱、工具列無分組／placeholder、開啟 URL 欄位未取得 focus。
原本已有 heading/list/quote CSS，不能說完全沒有樣式；strong/em 則依賴預設樣式。
另有正常編輯語意容易誤解：沒有選取文字時，粗體／斜體只設定接下來輸入的 marks，
不會改寫已有文字，因此當下 JSON 可以不變，但 active 應立即顯示。要改現有文字須先選取；
H2/H3 則直接套用目前段落。此行為也已用真實 Editor 測試。

| 操作 | 功能驗證 |
| --- | --- |
| 內文、H2、H3 | 真實命令、節點、DOM、heading select 值與序列化重載 |
| 粗體、斜體 | marks、active、strong/em、重載；另測 React 粗體按鈕與父表單更新 |
| 項目符號／編號清單、引言 | 節點、active、ul/ol/blockquote 與重載 |
| 分隔線 | hr 插入、DOM、重載；它不是持續啟用的格式 toggle |
| 連結 | 安全 href、selection 範圍、active、輸入 focus、編輯／移除、拒絕 javascript |
| Undo/Redo | 真實 history、JSON 回復／恢復、初始 Undo disabled |
| 舊純文字 | 套用標題與粗體，再經 server schema／序列化重載，換行與正文保留 |

這裡的 round-trip 是 **server schema → 可儲存 payload → JSON 序列化 → editor**，
不是遠端 DB／瀏覽器發布證據。本輪未更動或套用 migration。

視覺延續 Profile/Memberships 的白色 surface、柔和邊框與小面積藍色重點：

- 工具列分為段落、歷史、文字樣式、清單、引言／插入。用間距分組，沒有一排粗分隔線。
- active 淡藍底／藍色圖示，disabled 降階；保留 title、aria-label、aria-pressed 與 focus-visible。
- 選單文案改為內文／大標題／小標題，實際仍是 paragraph/H2/H3。
- Editor/public 共用 `.rich-content`：H2 1.4rem、H3 1.2rem、strong 700、em italic、
  可見清單縮排與 markers、輕量藍色引言、blue underline link。沒有另複製一套 reader CSS。
- 空內容用 CSS/data-placeholder 顯示「輸入公告內容…」，不會進 JSON。
- Mobile 採分組換行，按鈕 40px；desktop 36px。沒有固定高度、頁面 overflow hidden 或 sticky toolbar。
- Sticky 暫緩：避免 Admin header 重疊與 mobile 可視區被工具列占用，先維持正常文件捲動。

## 本輪人工驗收清單

Browser connector 目前沒有可用 browser；下列仍需 USER 在 local/test DB 驗收。
本輪只有 DOM 自動化，不宣稱真實視覺／touch／DB save 已通過。

**桌面 `/admin/announcements/new` 或測試公告編輯頁：**

1. 輸入「無限制的虛式」，選取後點粗體／斜體，確認立即可辨，游標移入後按鈕 active。
2. 選大標題／小標題／內文，確認 H2 > H3 > 正文；H1 不可選。
3. 建立兩種清單及巢狀清單，確認 markers、縮排；切換引言、插入可見 HR。
4. 選取部分文字 → 連結 → URL 欄自動 focus → 套用 HTTP/HTTPS；游標在連結內可編輯／移除。
   不安全 URL 顯示錯誤，文字與選取範圍不丟失。
5. Undo/Redo 確實回復／恢復內容，不能操作時有明顯 disabled；空文件有 placeholder，儲存仍拒絕空白。
6. local/test 儲存後重開，確認各格式；舊公告套格式前後，正文及換行相同。

**320／375px：**工具列分組換行、按鈕可點、select 與 URL 欄不出界；長文字／URL 不撐開頁面，
文件仍能垂直捲動，底部儲存／取消可達。也可比對 768／1440px。

**公開頁：**local/test 發布後確認標題、清單、引言、連結一致；列表／首頁只顯示純文字摘要，
SEO 沒有 JSON。關閉 JS 仍可讀文章，公開頁不應下載 Admin Tiptap chunk。

自動測試指令：`node --test tests/phase3e-editor-ux.test.mjs tests/phase3e-rich-content.test.mjs`。
RED 基線：14 組中 10 PASS／4 FAIL（分組/active hook、placeholder、URL focus、mousedown selection 保護）。
最終 GREEN：Editor UX 16/16，連同原 Rich Content focused tests 共 34/34；全回歸 450/450。
lint、TypeScript、diff check PASS；production audit critical/high/moderate/low/total 全部 0。
本輪未重跑 build、未 commit、未部署；瀏覽器視覺與真實 DB save 驗收仍待 USER 完成。

本輪修改限於 `RichTextEditor.tsx`、`RichTextRenderer.tsx`、`content.ts`、`editor-document.ts`、
`announcements.schema.ts`、`AnnouncementEditor.tsx`、`globals.css`、本文、
`tests/phase3e-editor-ux.test.mjs` 與 package/lockfile 的測試依賴；未修改 migration、API 或資料模型。

## 決策與範圍

原有公告只有 `content text not null`，沒有 summary 欄位；Service 限制 20,000 字元，
Repository 以 `title/content ilike` 搜尋。公告列表與首頁共用 `AnnouncementRow`，
個人 Dashboard 只列標題／時間。完整內容及 SEO 在 `/announcements/[id]`。

| 格式 | 評估 |
| --- | --- |
| HTML | 編輯器支援廣，但必須額外維護 HTML sanitizer、屬性與 URL 白名單。此輪不採用。 |
| JSON 文件 | 節點與格式可嚴格限制，適合視覺編輯、SSR React renderer；需要明確版本。採用。 |
| Markdown | 易讀、可攜，但視覺編輯互轉及 HTML／URL 安全仍要處理。此輪不增加轉換層。 |

既有 dependencies/lockfile 沒有 editor、Markdown parser、sanitizer 或 Tailwind Typography。
新增 Tiptap `@tiptap/react`、`@tiptap/pm`、`@tiptap/starter-kit`，均固定 `3.31.3`。
選擇其既有 ProseMirror JSON、選取範圍、清單與 undo/redo，避免自己實作 contenteditable。
套件 peerDependencies 包含 React 19；核心為 MIT，不使用付費服務或雲端功能。
Lexical 同樣能處理結構化文件，但本輪 Tiptap 的現成命令與 StarterKit 已直接涵蓋需求，
無須另外組裝工具列所需的低階命令。這不代表其他 editor 不可行。

參考：[Next.js 整合](https://tiptap.dev/docs/editor/getting-started/install/nextjs)、
[StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit)、
[核心授權](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md)。

## 資料與信任邊界

- `content_format`: `plain_text` 或 `rich_text_v1`；它就是 v1 的版本標記。
- `rich_content`: nullable JSONB，v1 為 `{ type: "doc", content: [...] }`。
- `content`: 保留純文字；rich mutation 由伺服器從驗證後的文件產生，忽略 client companion。
- 舊 API 未提供 format 時仍接受原本純文字 payload。新 Admin 表單只送 canonical rich 文件。
- 新格式沒有任意 HTML、CSS、事件屬性或 provider/editor 狀態。編輯器預設的 link target、
  class、rel、title 與清單樣式由 adapter 移除；Service 再以同一 schema 驗證，不信任 adapter。
- 限制：20,000 字元、120,000 UTF-8 bytes JSON、4,000 節點、16 層深度；空白、
  零寬空白或只有分隔線不算必填內容。這是本輪選定的社團公告防濫用上限。
- 未知節點／marks／attrs、H1、錯誤巢狀結構及不安全網址在 mutation 時拒絕。
  DB 只保護格式／JSON 根節點基本一致性；完整結構由 Service 負責。

## 舊公告與遷移

`202609130001_add_announcement_rich_content.sql` 只新增欄位與 constraint，
沒有 UPDATE 舊文字、刪除資料或重新發布公告。既有 rows 預設 `plain_text`，JSON 為 null。

舊公告閱讀時仍以 escaped text + `white-space: pre-wrap` 顯示。
編輯時只把 CRLF/CR 正規化為 LF；每兩個換行切一個 paragraph，段內單換行用 hardBreak，
空 paragraph 保留額外空行。`<script>`、`**文字**` 都只是文字，絕不推測 HTML/Markdown。
成功儲存才升級成 v1，發布時間及 returnTo 邏輯不變。

讀取到未知版本或無效 JSON：公開頁安全回退到純文字 companion；編輯頁禁止儲存，
避免使用不支援的 editor 覆寫原始文件。

套用順序：測試 DB migration → 驗證 → 安排 production migration → 部署程式。
本輪 **沒有套用遠端 migration**。canonical snapshot 的公告區塊標為待套用目標，
不能把它當作 remote 已驗證的證據。回退程式時保留新欄位，避免破壞已儲存的格式。
若回退到不認識 rich 欄位的舊後端，應暫停公告編輯，避免舊後端只更新純文字而留下不同步的 JSON。

本機 migration 驗證使用獨立 PostgreSQL 18、`127.0.0.1:55439`，只建假公告，
確認舊內容逐筆不變、預設格式正確、rich insert 成功、未知格式／null／缺少 doc type 被拒絕。
測試後已停止資料庫。沒有使用 Supabase 憑證。

## 編輯器與呈現

支援 paragraph、H2/H3、粗體、斜體、項目／編號清單、連結、引言、分隔線、復原／重做。
不提供 H1、inline code、表格、圖片、iframe、字色／字型、協作或 autosave。

`RichTextEditor` 只由 Admin 表單 dynamic import；`immediatelyRender: false` 避免 SSR hydration。
`RichTextRenderer` 是 server-compatible React mapping，不使用 Tiptap runtime、DOM parser
或 `dangerouslySetInnerHTML`。公開頁不需要 editor JS。
`rich-content` CSS 同時控制編輯與閱讀的段落、清單、標題、引言與長文字換行。
網站沒有 dark mode，本輪不新增。

工具列可 Tab 操作，有 label/title、切換按鈕 pressed state、heading select。
內容區有 textbox/multiline/required 訊號，實際必填由 client/server schema 驗證。
連結列留在正常文件流，工具列換行、控制項限制容器寬度；非 modal。

連結只允許完整 HTTP/HTTPS，拒絕其他 protocol、相對 URL、空白控制字元及 URL credentials。
不提供 mailto。連結同頁開啟，不接受 target/rel 等 author 屬性，也沒有 opener 問題。
貼上 HTML 只解析已啟用的 editor schema；不支援的樣式／節點不保留為 HTML。
即使 literal script/image 字串進入 text node，React 也只顯示文字。

搜尋仍對 `content`，未更改 query/filter/pagination。摘要及 SEO 經 `plainTextFromStoredContent()`，
只取文字；首頁沿用同一公告 row，SEO 仍沿用原本 160 字元截斷，卡片仍為兩行摘要。

## 本機人工 QA（尚待瀏覽器驗收）

目前 browser connector 回報 `No browser is available`。Node 測試包含 SSR、真實 editor schema
round-trip 與 mock API 表單流程；它們不代表實際瀏覽器／行動裝置驗收。

環境：Windows PowerShell、專案根目錄、**已套用 migration 的 local/test DB**、測試管理帳號。
不要將連到 production DB 的 localhost 當作可任意新增的測試環境。

1. `npm run dev`；預期 localhost 顯示 Next.js ready。
2. `/admin/announcements/new`：輸入示意標題「Rich Content QA」，內容「社課報名」。
   逐一套用 H2/H3、粗斜體、兩種清單、引言、分隔線；檢查 undo/redo。
3. 選取「報名」，新增 `https://example.com`、編輯、移除。輸入 `javascript:alert(1)`
   應顯示網址錯誤；不要實際開啟該字串。純文字／含格式貼上後應只保留支援格式。
4. 儲存測試草稿、重開編輯，確認格式與內容；在 local/test DB 才測發布後的公開頁。
5. 舊文字示意 `line 1\nline 2\n\nline 4`：閱讀、進 editor、儲存再讀，確認空行沒有消失。
6. 從 `?search=QA&page=1` 進編輯，成功／取消都回原 context。
   模擬 local API 失敗時留在表單、內容不清除。
7. 320/375/768/1440px：toolbar 不撐開頁面、URL 列可操作、長單字與網址換行、
   H2/H3 不搶過頁面 H1、清單縮排與引言清楚；公開頁關閉 JS 仍有完整內容。

自動驗證（專案根目錄）：
`node --test tests/phase3e-rich-content.test.mjs`、`npm run lint`、`npx tsc --noEmit`、
`npm test`、`git diff --check`、`npm audit --omit=dev`。
完整 build 若唯一失敗為 Geist/Google Fonts 網路，記為已知阻擋，不改字型。

## 後續重用

桌遊描述可重用 editor、schema、renderer、純文字抽取；仍需另案增加對應資料欄位、
Service canonicalization 與 legacy migration。本輪沒有修改桌遊描述。
評論建議先採評分＋純文字／有限格式，不直接套用整套公告工具列；本輪沒有評論功能。

## Phase 3E 基礎回合驗證紀錄與變更檔案

- RED：最先建立的 6 組測試全部失敗，涵蓋未實作的 schema、renderer 與 companion derivation。
- GREEN：18/18 focused、434/434 全回歸；原 baseline 416，加上 18 組新測試。
- lint、TypeScript、diff check：PASS；production audit critical/high/moderate/low/total 全部 0。
- Build：`BUILD BLOCKED BY KNOWN GOOGLE FONTS NETWORK LIMITATION`（Geist、Geist Mono）。
- Migration：隔離 PostgreSQL 實測 PASS；未驗證／套用 production migration。
- Browser：工具不可用，尚待上述人工清單；未宣稱視覺、貼上、真實儲存重載 PASS。

共 24 個檔案，沒有修改借用、帳號或桌遊描述：

```text
package.json
package-lock.json
src/libs/rich-content/content.ts
src/libs/rich-content/editor-document.ts
src/components/RichTextEditor.tsx
src/components/RichTextRenderer.tsx
src/components/(admin)/admin/announcements/AnnouncementEditor.tsx
src/components/(admin)/admin/announcements/announcementEditor.utils.ts
src/components/(public)/announcements/AnnouncementRow.tsx
src/app/(public)/announcements/[id]/page.tsx
src/services/announcements/announcements.schema.ts
src/services/announcements/announcements.service.ts
src/repositories/announcements.repository.ts
src/types/database.tsx
src/styles/globals.css
supabase/migrations/202609130001_add_announcement_rich_content.sql
supabase/verification/202609130001_announcement_rich_content.sql
supabase/schema/canonical-public-schema.sql
supabase/README.md
tests/phase3e-rich-content.test.mjs
tests/phase1c-schema-type-contracts.test.mjs
tests/phase2hd-announcements-editorial.test.mjs
tests/phase2hi4-public-detail-convergence.test.mjs
docs/rich-content.md
```
