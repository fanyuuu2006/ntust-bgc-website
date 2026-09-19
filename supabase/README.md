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

The hosted Development project is isolated from Production and has been
bootstrapped from the repository migration chain. The intended path is local
Supabase -> isolated Development Supabase -> reviewed Production promotion.
Collaborators receive Development-only values and never Production
credentials.

## Production safety

Production is maintainer-controlled. Never run `supabase db reset --linked`. Before a remote push, verify the target, run `supabase migration list`, then `supabase db push --dry-run`. Production apply and any historical ledger reconciliation require separate review.

## Verification and environment

`verification/verify-reproducible-schema.sql` checks required objects, register-key RLS/policy/RPC ACL invariants, Storage buckets, and the final migration version through PostgreSQL catalogs. CI repeats a clean local replay without Production secrets.

Use `.env.example` for variable names. Local and Development values must target their own environment. Use separate non-Production Turnstile/email credentials or leave optional integrations disabled. Never copy Production secrets to collaborator or Preview environments.

## Development Admin bootstrap

The bootstrap tool is maintainer-only and exists solely to establish the first
Admin in a new Shared Development environment, or to recover Development when
no usable Admin remains to provision Officers. It is not ordinary collaborator
onboarding and must never be used for Production provisioning. Once one
Development Admin is available, that Admin grants subsequent Development Admin
access through the normal `/admin/officers` workflow.

The command accepts only the hosted Development project
`mrsyfssstigartmhofuz`. It explicitly rejects Production, localhost, unknown
projects, malformed URLs, and execution without `--confirm-development`. It is
not an authorization bypass: the resulting account still needs a normal
Session, an open verified User, and historical Officer status. Subsequent Admin
authorization uses exactly the same historical-Officer rule.

1. Configure Development-only `.env.local` values.
2. Start the website and register the account normally at `/register`.
3. Review the account and requested synthetic Academic Year values.
4. Inspect the exact plan without writes:

   ```powershell
   npm run dev:bootstrap-admin -- --email admin@example.test --year 115 --start 2026-08-01 --end 2027-07-31 --title "Development Officer" --confirm-development --dry-run
   ```

5. After review, omit `--dry-run` to apply the same request.
6. Log in normally; the normal login flow creates the Session.

The command never creates Users, credentials, profiles, Sessions, Memberships,
or register keys. Verification uses the existing issue/consume RPC pair,
Academic Year creation follows the existing service/repository contract, and
Officer creation uses `create_officer_position`. Never use this tool against
Production.
