-- Personal developer support evidence is private; club Admin privileges do not grant access.
create table public.support_records (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_transaction_reference text not null,
  payment_status text not null default 'paid',
  paid_at timestamptz not null,
  public_display_name text,
  public_consent_at timestamptz,
  public_consent_method text,
  published_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_records_provider_check check (provider = lower(btrim(provider)) and char_length(provider) between 1 and 40),
  constraint support_records_reference_check check (provider_transaction_reference = btrim(provider_transaction_reference) and char_length(provider_transaction_reference) between 1 and 160),
  constraint support_records_provider_reference_key unique (provider, provider_transaction_reference),
  constraint support_records_payment_status_check check (payment_status in ('paid', 'refunded')),
  constraint support_records_display_name_check check (
    public_display_name is null or (
      public_display_name = btrim(public_display_name)
      and char_length(public_display_name) between 1 and 40
      and public_display_name !~ '[[:cntrl:]]'
    )
  ),
  constraint support_records_consent_method_check check (
    public_consent_method is null or (
      public_consent_method = btrim(public_consent_method)
      and char_length(public_consent_method) between 1 and 80
    )
  ),
  constraint support_records_consent_pair_check check (
    (public_consent_at is null) = (public_consent_method is null)
  ),
  constraint support_records_publication_check check (
    published_at is null or (
      public_consent_at is not null and public_display_name is not null
    )
  ),
  constraint support_records_withdrawal_check check (
    withdrawn_at is null or public_display_name is null
  )
);

create trigger update_support_records_updated_at
before update on public.support_records
for each row execute function public.update_updated_at_column();

alter table public.support_records enable row level security;
revoke all privileges on table public.support_records from public, anon, authenticated;
grant select, insert, update, delete on table public.support_records to service_role;
