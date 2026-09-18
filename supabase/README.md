# Supabase database workflow

Repository migrations are authoritative for reconstruction and deployment. `schema/canonical-public-schema.sql` is a generated schema-only reference, not a bootstrap mechanism.

## Local

Docker Desktop, Node.js/npm, and Supabase CLI are required.

```powershell
npm run db:start
npm run db:reset
npm run db:verify
```

`npm run db:verify:replay` performs a clean replay and catalog verification. `config.toml` contains no remote ref or secret. Supabase Auth is disabled because the application owns its session model. Seed execution is disabled, so replay contains no Production business rows.

## Shared Development

**NOT CREATED YET.** The intended path is local Supabase -> isolated Development Supabase -> reviewed Production promotion. Collaborators receive Development-only values and never Production credentials. Vercel Preview is unchanged by this checkpoint.

## Production safety

Production is maintainer-controlled. Never run `supabase db reset --linked`. Before a remote push, verify the target, run `supabase migration list`, then `supabase db push --dry-run`. Production apply and any historical ledger reconciliation require separate review.

## Verification and environment

`verification/verify-reproducible-schema.sql` checks required objects, register-key RLS/policy/RPC ACL invariants, Storage buckets, and the final migration version through PostgreSQL catalogs. CI repeats a clean local replay without Production secrets.

Use `.env.example` for variable names. Local and Development values must target their own environment. Use separate non-Production Turnstile/email credentials or leave optional integrations disabled. Never copy Production secrets to collaborator or Preview environments.