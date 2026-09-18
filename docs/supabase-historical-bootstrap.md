# Historical migration bootstrap corrections

These corrections make clean repository replay reproduce schema already present in Production. They are not new Production changes; already-migrated environments must not rerun them.

## 202608230001_normalize_membership_register_keys.sql

- Original Git blob: `efbbef0b44a6e24413416063388b9200908f38f8`.
- Defect: table creation omitted the RLS state recorded by the earliest canonical snapshot and Production.
- Correction: enable RLS immediately after creation; no policy, grant, or RPC changes.
- Evidence: replay has RLS enabled, no policies, service-role-only RPC execution, and a public schema dump equal to Production.

## 202609010004_enforce_academic_year_current_integrity.sql

- Original Git blob: `79d8bd955b24c234050f067f0a9ea786a118936c`.
- Defect: `202608240001` already created the same partial unique current-year index, but this migration aborted when it existed.
- Correction: validate the exact predecessor definition and reuse it; unexpected definitions still abort.
- Evidence: predecessor, replay, and Production use a unique btree on `is_current` where `is_current = true`.

## 202609170001_normalize_academic_year_dates.sql

- Original Git blob: `81a829473440b2a3a887cb0cbcf217730f623b3b`.
- Defect: the exact Production-data preflight rejected an empty bootstrap database.
- Correction: accept exactly zero rows or the original exact six-row predecessor. Every other non-empty state still raises `ACADEMIC_YEAR_PREFLIGHT_MISMATCH`; schema conversion always runs.
- Evidence: replay remains data-empty and produces Production-equivalent date columns, constraints, index, RPC, security, search path, and ACL.

## Ledger implications

`supabase_migrations.schema_migrations` stores `version`, `name`, and executed statement arrays. Current CLI alignment is version-based: edited applied versions are not offered for re-execution, while the remote ledger retains its originally executed statements. The blob IDs above preserve the audit trail. The new `202608220001` baseline is absent from Production history and needs a separate reviewed ledger decision before linked pushes.