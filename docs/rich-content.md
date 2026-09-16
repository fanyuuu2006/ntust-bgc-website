# Rich Content：公告、桌遊與活動

## RichEditor 圖片 migration 版本保留

借用生命週期 migration 已使用並部署版本 `202609160001`。RichEditor 圖片 Phase A
草稿中的 Storage migration 尚未部署；在恢復該工作並準備套用前，必須先將它改為當時
下一個可用的 migration 版本。不得以相同的 `202609160001` 版本套用第二份 migration。

## Phase 3E-E：Link Modal、中文註解與遠端 migration 完成

本節是最新狀態；下方 3E-D「尚未套用」保留當時唯讀診斷紀錄，不代表目前狀態。

### Link 與維護文件

連結設定改用既有 Modal，開啟前保存 selection 範圍；既有連結先延伸至完整 mark。
套用／移除時還原該範圍，native Dialog 關閉後才恢復 editor 焦點，不讓 URL 輸入框
改變連結套用位置。取消不改文件；無選字且不在 link 內時顯示提示，不插入 URL 或空 anchor。
仍只接受 http／https，拒絕帳密與不安全 scheme。活動外層 Modal 不會因內層 Link 關閉而關閉。

我們維護的 Rich Content source JSDoc／註解已改用繁體中文，聚焦安全責任、資料契約與
非直觀行為；不翻譯第三方 Tiptap 原始碼，也不改已驗證 migration 的英文 SQL comments。
公開 API 名稱、provider、Tiptap 術語與標準識別字保留原文。

### 2026-09-14 migration 執行紀錄

已核對 linked project、SUPABASE_URL 與 DATABASE_URL 的 project reference，皆為
`gcydchpuckbmctcjpokz`。操作採既有 Supabase CLI workflow：

1. 套用前 lint、TypeScript、492/492 tests、diff check 全通過；production audit 0。
2. `npx supabase db push --linked --dry-run` 僅列出以下兩份，seeds/roles 為空：
   - `202609130001_add_announcement_rich_content.sql`
   - `202609130002_add_rich_descriptions.sql`
3. USER 明確授權且前提成立後，執行 `npx supabase db push --linked`，兩份成功套用。
4. 唯讀 verification 確認欄位、NOT NULL/default、六個 constraints、migration history 正確。
   三張表 PostgREST select 新欄位、limit=0 全部回 200，**沒有執行 schema-cache reload**。
5. 套用前後筆數：公告 1、桌遊 607、活動 1；依 ID 排序的原 content/description 摘要校驗值全部一致。
   舊 rows 皆為 plain_text，新 JSON 欄位為 null。未改寫內容、未 seed、未代 USER PATCH 公告 5。

001 與 checkpoint 相同；002 與先前隔離 PostgreSQL 驗證內嵌 SQL 相同。
套用時檔案 SHA-256（之後不得改寫已部署 migration）：

- 001: `E7E5F4E3B6AA83F9DDD815A1E2CBDDACD94E703E6F17C5B26F60E6D64C0440A7`
- 002: `961E040251970B10595895CFF73C452CEDF91F3B75B4F7E175EEE5F69D289A72`

回退 application 不 DROP 新欄位；保留資料，後續修正使用新 forward migration。
原 PGRST204 缺欄位 blocker 已解除；真正 PATCH／reload／public rendering 留給 USER 按儲存驗收。
若有新錯誤仍使用既有 Error ID，不 suppress、不增加 generic retry。

### 人工驗收

在公告 5 的編輯頁選字 → Link → 輸入安全 URL → 套用；將游標放回連結測試預填、更新、移除與取消。
無選字時應顯示提示；javascript/data/含帳密 URL 應顯示驗證訊息。
活動 Modal 中開關 Link，外層表單要保留。桌面／375px／320px 確認欄位與按鈕不溢出。
再由 USER 自行執行格式／媒體 → Preview → 儲存變更 → reload → 公開詳情。
Agent 未提交、部署網站或代為修改公告內容。

## Phase 3E-D：未儲存預覽與 schema readiness

### 預覽

公告、桌遊與活動欄位標題旁的「預覽」直接讀取目前 form state（含未儲存標題）。
共用 `RichContentPreview` → 驗證 JSON → 同一 `RichTextRenderer`。
不 fetch、不建立 draft、不寫 localStorage、不儲存 DB。Editor 保持掛載；預覽關閉時
卸載播放器，避免隱藏 iframe 繼續播放。Editor 仍只用精簡媒體卡，預覽才載入真實播放器。

使用既有 Modal（max-w-3xl），文章在 70dvh 上限內捲動，手機減少內距。
採 Modal 而非切換 editor 模式，避免重建 Tiptap／selection；標題與關閉按鈕留在捲動區外。
空白內容顯示「目前沒有可預覽的內容」。非法 document 顯示本地安全訊息；非預期 render
exception 由局部 boundary 回報 Error ID，不卸載編輯表單、不暴露 raw cause。
Preview 的小型 React class 僅是 React error boundary；Editor 與 Preview 主元件仍為 FC/hooks。

### 2026-09-14 唯讀診斷結果

localhost 的 Next development env 指向遠端 Supabase，並非本機 Supabase。
直接 SQL 的 information_schema 與 API 零筆 select 一致：

| Table | 已有舊欄位 | 缺少欄位 |
| --- | --- | --- |
| announcements | content | content_format、rich_content |
| board_games | description | description_format、rich_description |
| events | description | description_format、rich_description |

migration history 共 16 筆，最新 202609080001；001/002 Rich Content migration 都不在其中。
公告 PATCH 經 service 驗證後實際包含 content、content_format、rich_content，
Repository 直接 update；程式已使用新欄位，DB 未升級，造成 code/schema drift。
原始 incident 未保留 missing-column message，不能追溯它第一個回報哪個欄位；
但兩個新欄位都已透過唯讀查詢確認不存在，不是僅 schema cache stale。
GET 的逐欄查詢回傳 42703 column does not exist；沒有為重現 PGRST204 對遠端送 PATCH。

未執行遠端 migration、DDL、schema-cache reload 或資料修改。未更換 localhost DB 設定。
因此此連線上的儲存／重載驗收仍等待 migration 授權；未儲存預覽不受影響。

### PGRST204 排查順序

Application RichContent code requires the corresponding migrations.
PGRST204 during create/update commonly indicates code/schema drift.
它不是 transient network error，不適用 PGRST303 read retry；應用層仍回安全 500 + Error ID。

1. 先辨識 Next development env 實際連線；不要因網站網址是 localhost 就認定 DB 是 local。
2. 唯讀檢查 supabase_migrations.schema_migrations；舊 history 不完整時不得僅靠檔案存在推論已套用。
3. 唯讀檢查 information_schema.columns；搭配 PostgREST select=欄位&limit=0，不取得公告內容。
4. 在已授權環境依序執行既有 migration，不 ad-hoc ALTER、不重跑整份 snapshot：
   - supabase/migrations/202609130001_add_announcement_rich_content.sql
   - supabase/migrations/202609130002_add_rich_descriptions.sql
   然後執行 supabase/verification/ 同版本 SQL；保留舊內容與筆數。
5. **只有 migration 已套且欄位存在、PostgREST 仍 stale 時**，才執行
   `NOTIFY pgrst, 'reload schema';`，再重查。不能以 reload 代替缺少 migration。

Repository 目前沒有 Supabase CLI local config；README 的 canonical 流程是 migration SQL +
對應 verification SQL。shared/production 的套用須另有明確授權，本次不自動初始化／seed DB。

參考：[PostgREST errors](https://docs.postgrest.org/en/v12/references/errors.html)、
[PostgREST schema cache](https://docs.postgrest.org/en/v12/references/schema_cache.html)。

### 人工驗收

在 /admin/announcements/new、桌遊 new/edit、活動新增／編輯：

1. 改標題、輸入未儲存 H2/H3/H4、清單、引言、粗斜體與連結，再預覽；應顯示新版本。
2. 預覽 YouTube、Bilibili、HTTPS video/audio；確認不 autoplay、播放器可操作。
3. 桌面／375px／320px：文章內捲、標題／關閉可達、長 URL 與媒體不撐寬頁面。
4. 關閉後 editor 內容不變；活動外層 Modal 仍開啟；再開預覽仍是同份未儲存內容。
5. DB migration 在已授權測試環境套用後，再驗 save → reload → public detail。

本輪瀏覽器／實際影音播放不能由 jsdom 測試證明，須人工 QA。

## Phase 3E-C：Provider 輸入與精簡編輯區

此節取代下方 3E-B 的媒體輸入與 editor 版面描述；儲存欄位與 migration 不變。

- `resolveMediaInput()` 是小型正規化邊界：URL／官方 iframe → provider ID 或直接檔案 URL。
  新增 Bilibili 時沿用 `videoEmbed.attrs.provider/videoId`，provider 可為 youtube、bilibili；
  direct video/audio 維持既有節點。Server 仍驗證精確 allowlist，並衍生搜尋文字。
- YouTube 接受 watch、youtu.be、embed 與 youtube-nocookie embed；Bilibili 接受
  `/video/BV…` 與 `player.bilibili.com/player.html?bvid=…`。
  BV 僅接受 BV 加 10 位英數；追蹤、自動播放、分 P 等參數不儲存，不宣稱支援 AV/OGV/b23 短網址。
- iframe 輸入上限 8192 字元，只接受單一、空內容的 iframe，且 src 必須唯一並加引號。
  不掛載輸入 HTML；只抽取 src、處理常見 URL entity，再執行同一 hostname/ID 驗證。
  iframe 的 width、style、事件、allow 等全部丟棄。多個 iframe、script、子元素、未知來源拒絕。
  protocol-relative src 僅在 iframe 輸入補成 HTTPS；原始 HTML 永不持久化。
- 新插入的直接影片依 mp4/webm/ogv/mov/m4v 路徑副檔名辨識；音訊依
  mp3/ogg/oga/wav/m4a/aac/flac。HTTPS、無帳密、最長 2048 字元。
  Spotify／Apple Music／SoundCloud 頁面不當音訊檔；需未來明確 provider adapter。
  舊 v1 無副檔名 HTTPS direct node 仍可讀取，避免破壞既存內容；更新時須符合新輸入規則。
  副檔名不是 MIME/codec 保證，server 不下載或代理 URL，實際播放需人工確認。

### Renderer、隱私與 CSP

YouTube 使用 youtube-nocookie；Bilibili 使用
`https://player.bilibili.com/player.html?bvid=ID&autoplay=0`。
兩者 16:9、lazy、具 title/allowFullScreen、strict-origin-when-cross-origin。
Bilibili 只授予 fullscreen；YouTube 保留 fullscreen、picture-in-picture、encrypted-media。
不授予 camera/microphone/geolocation/autoplay，不接受使用者 iframe attributes。
沒有盲加可能破壞播放器 scripts/same-origin 的 sandbox；這不是可執行任意 HTML 的框架。
公開播放器仍會向第三方發送請求；editor 只顯示本地 preview，不連線播放器。
直接影音保留 controls、preload=metadata，無 autoplay。

本次重新搜尋原始碼仍未找到 CSP，未新增／放寬任何 header。
若部署層有政策，frame-src 需精確合併
`https://www.youtube-nocookie.com https://player.bilibili.com`，保留既有必要 origin。
media-src 應允許實際檔案 origin；任意 HTTPS 來源意味 `media-src https:` 的較廣政策，
應由部署決策明確採用，本次未擅自設定。不可使用 frame-src *。

官方參考：[Bilibili 外鏈播放器參數](https://player.bilibili.com/)、
[YouTube 嵌入與隱私強化模式](https://support.google.com/youtube/answer/171780)。

### 編輯與捲動所有權

媒體設定改用既有 native Modal，預設自動辨識，輸入可貼分享網址或官方 iframe。
無效輸入是本地 MediaInputError／server Zod 400，不產生 incident Error ID。
媒體 atom 顯示 provider、精簡來源與就近的編輯／移除；不自動載入外部 player。
巢狀 Modal 的 close/cancel 停止 React 事件傳播，避免關閉活動編輯表單。

Toolbar 在內容 viewport 外，內容手機最大 50dvh、桌面 60dvh，可獨立縱向捲動；
頁面仍可捲動。手機 toolbar 分層級／history 與可水平捲動的次要控制列，維持可按大小。
只收斂 editor 內文間距，不更改 public typography。Toolbar focus 不主動捲動整頁。
本輪不加入 sticky form actions；先由有界 editor 消除長文造成的無限表單高度，
保留公告／桌遊／活動各自既有儲存、取消與獨立刪除流程。

### 人工 QA（尚未宣稱視覺或播放 PASS）

瀏覽器 connector 未提供可用 browser。單元測試使用真實 Tiptap/React/jsdom，
只證明 commands、JSON、DOM、Dialog 事件與 server validation；不證明 layout 或播放。
在已套 migration 的本機測試 DB 使用公告 new/edit、桌遊 new/edit、活動編輯：

1. 桌面／375px／320px：貼長文，確認 toolbar 方便存取、內容內捲、頁面也可捲，無水平溢出。
2. 在文末選字套粗體/H4，確認 selection 保留、游標可見；儲存／取消可達。
3. 開媒體 Modal 不推動文稿；貼長 URL/iframe，確認欄位、按鈕與內部捲動可用。
4. 分別插入 YouTube 分享 URL/iframe、Bilibili BV URL/player iframe、HTTPS mp4/mp3；
   編輯／移除，再 save → reload → public render，核對結構與實際播放。
5. 輸入假 provider 網域、script、多 iframe、Spotify 頁面，應是可修正驗證訊息且無 Error ID。
6. 活動 Modal 內開／關媒體 Dialog，確認外層表單與未儲存內容保留。
7. legacy 文字、H2/H3/H4、搜尋／摘要／SEO、returnTo 維持；僅用本機資料，不操作 production。

## Phase 3E-B：跨內容欄位與媒體

Phase 3E checkpoint：`8bf94c4 feat(content): add rich announcement editing`。
提交前重新驗證 450/450、lint、TypeScript、diff check、production audit 0。
下方 Phase 3E/UX 章節保留當時的決策與證據；本節描述擴充後行為。

### 語意與共用邊界

- entity title 由詳情頁擁有 H1。工具列明確標為「內文／H2 標題／H3 標題／H4 標題」。
  schema、Tiptap 與 renderer 同步只允許 2/3/4，沒有開放 H1/H5/H6。
- 一個 `RichTextEditor`、一個 SSR `RichTextRenderer`、一套 `.rich-content` typography。
  H4 1.05rem，低於 H2/H3；外層頁面仍擁有寬度與間距。
- Editor 保持 React FC/hooks；媒體使用 Tiptap selectable atom。沒有新增 editor 套件。
- 未預先建立 `review` profile。未來 review 應以段落、粗斜體、連結為限，同時限制
  editor extensions 與 server allowlist；不能只隱藏工具列。本輪沒有評論／評分功能。

### 媒體契約

```ts
{ type: "videoEmbed", attrs: { provider: "youtube", videoId: "dQw4w9WgXcQ" } }
{ type: "videoEmbed", attrs: { provider: "direct", src: "https://example.com/video.mp4" } }
{ type: "audioEmbed", attrs: { src: "https://example.com/audio.mp3" } }
```

`normalizeMedia()` 僅接受 HTTPS、無帳密、無空白／控制字元、最多 2048 字元。
YouTube 嚴格比對 `youtube.com`、`www.youtube.com`、`m.youtube.com` 的 `/watch`，
以及 `youtu.be/ID`；ID 為 11 位英數、`_`、`-`。追蹤／播放起點參數不儲存。
非 YouTube 來源不能當作 YouTube iframe；direct 媒體只會進 video/audio。
Server 再次檢查精確 attributes，不接受事件、style、iframe HTML 或任意 provider。

公開 renderer 自行組成 `https://www.youtube-nocookie.com/embed/ID`，16:9、lazy、
具 title、fullscreen、`strict-origin-when-cross-origin`。不載入 YouTube API script。
採 privacy-enhanced origin，**仍會有第三方請求**，不宣稱消除追蹤或 cookie。
直接媒體用原生 controls、`preload="metadata"`，不 autoplay；不先由 server 下載 URL。
HTTPS 並不保證網址可播放：檔案 codec、MIME、來源防盜連及有效期限仍由提供者決定。
不要貼需保密的簽名網址；已發布文件中的媒體 URL 對讀者可見。

編輯器只有一個「新增或編輯媒體」按鈕，打開正常文件流中的類型／URL 面板。
媒體以可選取卡顯示來源，不在 editor 發起外部播放器請求；選取後可替換、移除，
或使用 Delete/Backspace。公開頁才顯示播放器。沒有裁切／縮放／上傳功能。
貼上任意 iframe/video HTML 不會建立媒體，須經工具列插入；JSON 重載保留媒體。
媒體的 canonical URL 作為可搜尋文字 companion；純媒體公告也算有意義內容。

### CSP 稽核

原始碼的 `next.config.ts`、layouts 與 route/header helper 沒有 CSP 設定，repository
也沒有 `vercel.json`。本輪沒有新增或放寬 CSP，**origin 變更為無**。
無法由 repository 證明部署平台／proxy 是否另加 header，部署前須查實際 response。
若平台已有 CSP，需合併允許 `frame-src https://www.youtube-nocookie.com`，並保留
既有 Turnstile 等必要 frame origins；不要改成 `frame-src *`。
直接媒體需要其實際 HTTPS origin 在 `media-src` 內。若營運要求任意 HTTPS 媒體，
應明確評估 `media-src https:`；本輪未擅自替平台設定這項政策。

參考：[Tiptap Node API](https://tiptap.dev/docs/editor/extensions/custom-extensions/create-new/node)、
[YouTube player parameters](https://developers.google.com/youtube/player_parameters)、
[YouTube privacy-enhanced mode](https://support.google.com/youtube/answer/171780)。

### 桌遊／活動資料與向後相容

稽核結果：兩者 `description text` 都可為 null，舊 Service 上限 2000 字，搜尋皆使用
`name/description ilike`。桌遊完整內容在公開詳情；活動完整內容目前在 Admin 詳情，
沒有獨立公開／會員活動詳情 route。活動清單、社員 Dashboard 主要列名稱與時間。

| 欄位 | 用途 |
| --- | --- |
| `description` | 舊文字保留；rich 寫入時 server 衍生，供搜尋／摘要／桌遊 SEO |
| `description_format` | `plain_text` 預設或 `rich_text_v1` |
| `rich_description` | nullable JSONB canonical document |

公告維持原來的 `content/content_format/rich_content`；描述欄依同樣命名規則使用
`description/description_format/rich_description`，不建立通用 CMS table。
`storedDescription()` 只映射欄名。legacy converter 不解讀 HTML/Markdown，仍以
雙換行為段落、單換行為 hardBreak，保留空行（CR/CRLF 正規化 LF）。

`descriptionFields`／`validateDescription`／`canonicalizeDescription` 在 domain schema
驗證後衍生 companion，不信任 client 傳來的文字。Rich 上限沿用 20,000 字元／120,000
UTF-8 bytes／4000 nodes／16 層；舊純文字 API 仍限 2000 字。
可選描述允許空白 editor，會同步轉為 `description=null, plain_text, rich_description=null`。
只修改名稱／時間的 PATCH 不會清空描述。未知版本可安全閱讀 companion，但 UI 阻止覆寫。

桌遊 new/edit 保留原有欄位、inventory、驗證與 returnTo；活動 create/edit 沿用 modal，
只擴為既有 lg 尺寸以容納 editor，關閉時卸載 editor 避免下次開啟沿用舊文件。
失敗不重設內容；活動仍 refresh 同一列表。類別／位置等簡短說明繼續用純文字。
Public renderer 不 import editor，Tiptap 只由 Admin dynamic import；沒有把讀取頁改為 Client。

### Migration 與驗證限制

新增 `202609130002_add_rich_descriptions.sql`，不修改已 checkpoint 的 001。
順序為 001 公告 → 002 桌遊／活動 → 新程式；兩個 migration **均未套遠端**。
新 SQL 只有 additive columns／constraints／comments，沒有 UPDATE legacy 文字。
canonical snapshot 明確標記待套用目標，不代表 remote 現況。
回退到舊版本時應暫停 rich 編輯，保留 JSON 欄位，避免舊後端使 companion 不同步。

本輪使用隔離本機 PostgreSQL 18（127.0.0.1:55439）的 `phase3eb_qa` schema，
將 SQL 的 public qualifier 替換為測試 schema 後執行，檢查舊文字/null、預設、
rich 寫入、invalid format/root/null 拒絕。另以真實 server schema → JSONB → reload
驗證 H4/YouTube/video/audio 與 companion，測試後已停止 DB。未使用 production 憑證。
這不是遠端 migration／完整應用程式儲存的驗收證據。

### 人工 QA

本輪 browser connector 回傳空 browser 清單，因此不宣稱視覺、播放或 touch PASS。
請在已套 001/002 的 **local/test DB** 執行 `npm run dev`：

1. 公告、桌遊、活動各建立測試內容：H2「介紹」、正文粗斜體、清單、YouTube、音訊、
   引言、HR、H3/H4「注意事項」。選取媒體 → 檢查 URL → 替換／移除 → Undo/Redo。
2. 儲存、重新開啟 editor，比對結構；桌遊公開詳情／公告詳情／活動 Admin 詳情確認播放器。
   YouTube 是否允許該影片嵌入、直接媒體 codec 是否支援，須以可公開播放來源實測。
3. 舊多行描述：未儲存前文字不變；套格式儲存後文字／空行保留。清空可選描述應成功。
4. 320／375／768／1440px：工具列換行、URL 面板不超寬；UUID/長 URL 可換行；
   YouTube 16:9、audio/video controls 可操作；modal/document 可捲至儲存／取消。
5. 模擬 local API 失敗後 editor 內容留存；桌遊儲存／取消保留原 list query；活動不離開列表。
6. 公開頁關閉 JavaScript 仍可讀；Network 不應下載 Tiptap editor chunk。摘要／SEO 不含 JSON。

本輪未 commit Phase 3E-B、未 push、未部署、未套遠端 migration。

驗證結果：起始 7 組 RED 全部失敗（缺少 H4／媒體／domain rich persistence）；
最終 focused 48/48、全回歸 464/464（checkpoint 450 + 14）。lint／TypeScript／
diff check PASS；production audit critical/high/moderate/low/total 全部 0。
新增測試涵蓋真實 Tiptap 媒體替換／刪除與重載、domain schema／Service companion、
表單失敗保留與 return context。修正舊測試的 import loader 與已移往 renderer 的樣式斷言；
未移除原 domain/security 測試。未重跑 build。

本輪 30 個檔案（不含 ignored `.temp` 本機驗證紀錄）：

```text
docs/rich-content.md
src/components/RichTextEditor.tsx
src/components/RichTextRenderer.tsx
src/libs/rich-content/content.ts
src/libs/rich-content/editor-document.ts
src/libs/rich-content/media.ts
src/libs/rich-content/editor-media.ts
src/libs/rich-content/description.ts
src/styles/globals.css
src/types/database.tsx
src/services/board-games/board-games.schema.ts
src/services/events/events.schema.ts
src/repositories/board-games.repository.ts
src/repositories/events.repository.ts
src/components/(admin)/admin/board-games/BoardGameForm.tsx
src/components/(admin)/admin/events/EventActions.tsx
src/components/(admin)/admin/events/EventRecords.tsx
src/app/(admin)/admin/board-games/[id]/edit/page.tsx
src/app/(admin)/admin/events/[id]/page.tsx
src/app/(public)/board-games/[id]/page.tsx
supabase/README.md
supabase/schema/canonical-public-schema.sql
supabase/migrations/202609130002_add_rich_descriptions.sql
supabase/verification/202609130002_rich_descriptions.sql
tests/phase2hf-board-game-detail.test.mjs
tests/phase2jc-query-contract.test.mjs
tests/phase2ka0-public-auth-blast-radius.test.mjs
tests/phase3e-rich-content.test.mjs
tests/phase3e-editor-ux.test.mjs
tests/phase3eb-rich-expansion.test.mjs
```

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


### Link Modal：選取、游標插入與改名

連結操作支援三種情況：選取文字後新增、在空游標位置直接插入，以及編輯既有連結。Modal 皆提供「顯示文字」與「連結網址」；既有連結會展開完整 mark 範圍並預填文字與網址。

套用時使用開啟 Modal 前保存的範圍。顯示文字未改動時只更新 link mark，保留原有格式；改名或新增文字時，以單一 ProseMirror transaction 替換範圍，保留起點的非連結 marks。完成後游標位於連結後方，stored marks 明確排除 link，避免後續輸入沿用網址。移除連結只移除 mark，取消不改文件。

網址仍須通過既有 HTTP(S) 與禁止帳密的驗證；空白顯示文字與不安全網址只顯示欄位錯誤。此調整不涉及 schema、renderer 或資料庫。
# Phase 3L-A：Rich Content 圖片契約與 Storage 基礎

Rich Content v1 新增明確的 `image` block atom，僅保留 `src`、`alt`、`caption`。
`src` 必須是目前 Supabase project 的 `rich-content-images` public bucket URL，object key
固定為 `uploads/YYYY/MM/<UUID>.<jpg|png|webp>`；不接受外部圖片網址。Server 以
`SUPABASE_URL` 建立 URL，Client-side 文件驗證使用同值的公開設定
`NEXT_PUBLIC_SUPABASE_URL`。Supabase project URL 不是憑證，secret key 仍只存在 Server。

圖片只允許管理員經 `POST /api/admin/rich-content/images` 上傳。Route 接收一個
`multipart/form-data` 的 `file`，Server 同時檢查 4 MiB 上限、宣告 MIME 與 JPEG／PNG／WebP
signature，使用隨機路徑且 `upsert: false`。這項 signature 檢查只確認容器識別碼與宣告格式
一致，不解碼像素、不保證圖片內容完整，也不是惡意程式掃描或影像轉檔。

Storage migration `202609160002_add_rich_content_images_bucket.sql` 宣告 public-read bucket、
大小與 MIME 限制，不建立 anon/authenticated 寫入 policy。公開 renderer 使用結構化
`figure/img/figcaption`、lazy loading 與原生 `<img>`，不使用 raw HTML、signed URL、
Next/Image 或 Vercel image optimization。

V1 不提供刪除 Storage object 的 API，也不在移除 node 或刪除 entity 時自動刪檔。
目前沒有 reference table 可證明 object 未被其他文件引用；小量 orphan 暫時保留，避免破壞
仍在發布中的內容。

### Phase 3L-B：共用 Editor 圖片操作

公告、桌遊描述與活動沿用同一個 `RichTextEditor` 圖片按鈕。插入流程保存開啟 Modal 時的
ProseMirror 位置，完成非同步上傳後在該位置插入；若文件同時改變導致位置超出範圍，位置會
限制在目前文件內容尾端。Client 不組合 Storage URL，只使用 upload API 回傳且再次通過
canonical validator 的 `data.src`。

選取既有 image atom 後，同一按鈕顯示「編輯圖片」，可修改 alt、裝飾狀態與 caption，且
`src` 不可編輯、不會重新上傳。選取 node 後可用標準 Backspace／Delete 移除；這只修改文件，
不刪除 Storage object。圖片檔案 paste/drop 會被攔截，普通文字 paste/drop 不受影響。

`SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_URL` 必須正規化為相同 HTTPS origin。前者只供 Server；
後者是可公開的 project origin，供瀏覽器驗證 persisted image URL。任何 secret/service-role key
仍禁止進入 `NEXT_PUBLIC_*`。Vercel 環境變數變更會在下一次 Preview／Production build 生效。
