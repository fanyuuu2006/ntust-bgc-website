# Supabase 資料庫說明

## 這個資料夾是做什麼的？

這裡放和 Supabase 資料庫有關的檔案：目前資料表結構的參考，以及未來資料庫
變更的紀錄。一般網站功能開發時，不需要直接修改這裡的 SQL。

## 檔案怎麼看？

| 位置 | 用途 |
| --- | --- |
| `schema/canonical-public-schema.sql` | 已驗證的目前 remote public schema 完整參考；未部署 migration 不會預先混入。 |
| `migrations/` | 未來資料庫結構有變動時，放新 migration 檔案的地方。 |
| `verification/` | 確認資料表結構有沒有建立正確的檢查 SQL。 |

## 接手後平常怎麼做？

1. 平常開發網站不需要執行 schema SQL。
2. 要改資料表時，先和負責資料庫的人確認。
3. 新 migration 只新增，不修改舊檔。
4. 不要把密碼、service-role key、真實會員資料放進 repository。

## 目前要注意的事

目前線上資料庫的舊 migration 紀錄不完整，因此
`canonical-public-schema.sql` 先作為交接與全新資料庫參考；不要直接拿去執行
在線上資料庫。

## 想深入了解

需要重建新資料庫或部署 migration 時，再閱讀 schema 檔並詢問專案維護者。
