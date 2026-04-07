alter table public.wheel_wins
  add column if not exists campaign_id uuid null references public.wheel_campaigns(id) on delete set null;

alter table public.wheel_wins
  add column if not exists campaign_name_snapshot text null;

create index if not exists idx_wheel_wins_campaign_id
  on public.wheel_wins (campaign_id, won_at desc);
