create table public.site_settings (
  id boolean primary key default true check (id = true),
  site_name text not null,
  site_full_name text not null,
  seo_title text not null,
  seo_description text not null,
  contact_email text,
  social_links jsonb not null default '[]'::jsonb,
  logo_media_url text,
  favicon_media_url text,
  default_og_image_url text,
  hero_title text,
  hero_description text,
  hero_image_url text,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users(id) on delete set null,
  constraint site_settings_social_links_array check (jsonb_typeof(social_links) = 'array')
);

alter table public.site_settings enable row level security;

revoke all privileges on table public.site_settings from public, anon, authenticated;
grant select, insert, update on table public.site_settings to service_role;
