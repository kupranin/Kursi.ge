create table if not exists public.wheel_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  total_prizes_limit integer null check (total_prizes_limit is null or total_prizes_limit >= 0),
  total_prizes_used integer not null default 0 check (total_prizes_used >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint wheel_campaigns_period_check check (ends_at > starts_at)
);

alter table public.wheel_prizes
  add column if not exists campaign_id uuid null references public.wheel_campaigns(id) on delete set null;

create index if not exists idx_wheel_campaigns_active_period
  on public.wheel_campaigns (is_active, starts_at, ends_at);

create index if not exists idx_wheel_prizes_campaign
  on public.wheel_prizes (campaign_id, is_active, sort_order);
