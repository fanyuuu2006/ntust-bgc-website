-- Keep the authorization anchor deterministic: exactly zero or one current year.
-- Repair legacy duplicates before enforcing the invariant.
with ranked_years as (
  select id, row_number() over (order by start_date desc, id desc) as row_number
  from academic_years
  where is_current = true
)
update academic_years
set is_current = false
where id in (select id from ranked_years where row_number > 1);

create unique index if not exists academic_years_one_current_year_idx
  on academic_years ((is_current))
  where is_current = true;
