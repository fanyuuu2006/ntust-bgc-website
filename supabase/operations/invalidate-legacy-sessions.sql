-- Stage C：需 USER 另行授權；不是 db push 自動套用的 migration。
-- 僅在 Stage A + hash application 已驗收、所有舊部署入口已停用後執行。
\set ON_ERROR_STOP on
\if :{?approve_legacy_session_invalidation}
\else
  \echo 'STOP: explicit approval variable required'
  \quit 1
\endif
\if :approve_legacy_session_invalidation
begin;
lock table public.sessions in access exclusive mode;
-- 此階段只撤銷既有憑證；禁止 legacy writer 的結構限制留待獨立 cleanup migration。
-- 因此必須先停用所有舊部署入口，否則交易結束後仍可能新增 raw 憑證。
delete from public.sessions where token is not null or token_hash is null;
commit;
\else
  \echo 'STOP: approval not granted'
  \quit 1
\endif
