-- 新帳號預設加入評論貢獻排行；既有 false 設定不批次改寫，避免無法辨識歷史退出意願。
alter table public.users
  alter column review_contributor_ranking_opt_in set default true;

comment on column public.users.review_contributor_ranking_opt_in is
  '是否顯示於評論貢獻排行；新帳號預設為 true，使用者可隨時關閉。既有 false 設定維持退出。';
