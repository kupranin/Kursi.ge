create extension if not exists "pgcrypto";

create table if not exists public.wheel_prizes (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null,
  display_label text not null,
  description text null,
  weight integer not null default 1 check (weight > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  segment_color text null,
  starts_at timestamptz null,
  ends_at timestamptz null,
  stock_limit integer null check (stock_limit is null or stock_limit >= 0),
  stock_used integer not null default 0 check (stock_used >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.wheel_wins (
  id uuid primary key default gen_random_uuid(),
  user_id text null,
  phone text null,
  email text null,
  prize_id uuid not null references public.wheel_prizes(id) on delete restrict,
  prize_name_snapshot text not null,
  prize_label_snapshot text not null,
  weight_snapshot integer not null,
  won_at timestamptz not null default now(),
  is_redeemed boolean not null default false,
  redeemed_at timestamptz null,
  admin_note text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_wheel_prizes_active_order
  on public.wheel_prizes (is_active, sort_order, created_at desc);

create index if not exists idx_wheel_wins_won_at
  on public.wheel_wins (won_at desc);

create index if not exists idx_wheel_wins_prize_id
  on public.wheel_wins (prize_id);
