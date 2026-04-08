create table if not exists public.clients_import (
  id bigserial primary key,
  source_created_at text,
  source_updated_at text,
  user_identifier text not null,
  user_identifier_encrypted text,
  active boolean,
  client_type text,
  name text,
  phone_number text,
  phone_number_verified boolean,
  email text,
  email_verified boolean,
  marketing_preferences_agreement boolean,
  bank_account_details text,
  created_at timestamptz not null default now()
);

create unique index if not exists clients_import_user_identifier_idx
  on public.clients_import (user_identifier);

create index if not exists clients_import_phone_idx
  on public.clients_import (phone_number);

create index if not exists clients_import_email_idx
  on public.clients_import (email);
