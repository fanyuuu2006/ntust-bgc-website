# Code Quality Audit

日期：2026-10-22

## 審查範圍

本次以 `feat/rich-editor-image-upload` 工作樹為基礎，檢查 Rich Text Editor、Rich Content 圖片正規化、相關測試、`src/` 中的 React／TypeScript 使用方式，以及 Tailwind CSS 4 設定與代表性 utility class。

## 使用工具

- `npm run lint -- --quiet`
- `npx tsc --noEmit`
- `node --test tests/phase3l-rich-content-images.test.mjs tests/phase3l2-rich-content-image-editor.test.mjs`
- `git diff --check`
- `npm run build`
- `rg` 搜尋未使用函式、圖片元素、Tailwind arbitrary properties 與 ESLint disable

## 本輪修復

### Low — Rich Editor 死碼

移除已不再被 Toolbar、Paste 或 Drop 使用的 `showImageInsert`，避免舊 Dialog 插入流程再次被誤用。

檔案：`src/components/RichTextEditor.tsx`

### Low — Blob 預覽的圖片元素說明

上傳中的本機 Blob 預覽不適合使用 `next/image`，因為它不是穩定的遠端圖片來源，也不應進入 Next Image 的最佳化流程。保留原生 `<img>`，並加入局部 `@next/next/no-img-element` 說明；正式內容中的圖片渲染規則未改變。

檔案：`src/components/RichTextEditor.tsx`

### Low — Object URL 生命週期

上傳預覽在成功、失敗與元件卸載時清理 Object URL，避免 Blob 參考持續佔用記憶體。Blob URL 不會寫入 Rich Content JSON。

檔案：`src/components/RichTextEditor.tsx`

## Rich Editor 測試狀態

現有 `phase3l2-rich-content-image-editor.test.mjs` 仍包含舊版「開啟 Dialog、填寫欄位、按上傳」流程假設。這些測試需要改寫為 Toolbar／Paste／Drop 直接上傳流程；不能只刪除斷言。完整 Rich Editor 測試目前不能標示 PASS。

## TypeScript／React 審查

- 未發現需要使用 `any` 或 `@ts-ignore` 的新增程式碼。
- 圖片上傳仍透過既有 API 與檔案驗證，不改變權限或 Storage 契約。
- 非同步完成後只插入成功取得的 canonical URL。
- 編輯器內容不會因預覽而整篇重設。
- 真實瀏覽器中的拖放、貼上、選取位置與快速重複操作尚未驗證。

## Tailwind CSS 4 檢查

專案使用 `tailwindcss` 與 `@tailwindcss/postcss` 4.x，並以 `@import "tailwindcss"` 啟用 CSS-first 設定，未發現需要遷移的舊版 config。

代表性檢查結果：

- `[scrollbar-width:none]` 與 `[&::-webkit-scrollbar]:hidden` 仍是合法的 CSS arbitrary property／selector，用於隱藏橫向導覽列捲軸，暫不修改。
- 未發現明確失效或已移除的 utility class。
- 動態 class 需維持完整字串，避免 Tailwind 掃描器無法分析；本輪未進行大範圍 class 重寫。
- 可能影響視覺的 arbitrary value、responsive spacing 與 Dark Mode class 保留待人工視覺驗收。

## 驗證結果

| 檢查 | 狀態 | 備註 |
| --- | --- | --- |
| ESLint | NOT VERIFIED | 指令已啟動，但本次執行未取得可靠的最終 exit summary |
| TypeScript | NOT VERIFIED | 未取得可靠的最終 exit summary |
| Rich Editor Tests | FAIL | 舊 Dialog 流程測試尚未完成改寫 |
| `git diff --check` | PASS | 未發現 whitespace error |
| Production Build | NOT VERIFIED | 尚未取得完整最終輸出 |
| Browser／RWD／Light／Dark | NOT VERIFIED | 本輪未使用瀏覽器驗證 |

## 尚未處理

1. 將舊圖片編輯器測試改寫成三種入口共用 Pipeline 的測試。
2. 以真實瀏覽器驗證 Drag & Drop、Clipboard、游標位置及上傳期間繼續編輯。
3. 完整 Tailwind utility 視覺回歸檢查。
4. Rich Editor PR 尚未達到可安全建立的條件，因此本輪不開始 API 文件分支。

