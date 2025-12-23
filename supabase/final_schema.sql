-- 1. Create Rates Table
create table if not exists public.rates (
  id uuid default gen_random_uuid() primary key,
  currency text not null,
  type text not null check (type in ('OFFICIAL', 'BLACK_MARKET')),
  buy_price numeric not null,
  sell_price numeric not null,
  source text,
  date text, -- Added for compatibility with fetch-rates
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.rates enable row level security;

create policy "Rates are public"
  on public.rates for select
  using ( true );

create policy "Service role can insert rates"
  on public.rates for insert
  with check ( true ); 

-- 2. Create Commodities Table
create table if not exists public.commodities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price_gram_usd numeric not null,
  price_gram_dzd numeric not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.commodities enable row level security;

create policy "Commodities are public"
  on public.commodities for select
  using ( true );

-- 3. Create Profiles Table (for Auth)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'user' check (role in ('user', 'admin', 'super_admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Admins can read all profiles"
  on public.profiles for select
  using ( 
    auth.uid() in (select id from public.profiles where role in ('admin', 'super_admin'))
  );

-- Only admins can insert/update rates and commodities
create policy "Admins can insert commodities"
  on public.commodities for insert
  with check (
    auth.uid() in (select id from public.profiles where role in ('admin', 'super_admin'))
  );

-- Trigger to create profile on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error on replay
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Create User Assets Table (Phase 4)
create table if not exists public.user_assets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  currency text not null,
  amount numeric not null default 0,
  label text, -- e.g., 'Cash', 'Wise', 'Bank of Algeria'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.user_assets enable row level security;

create policy "Users can view own assets"
  on public.user_assets for select
  using ( auth.uid() = user_id );

create policy "Users can insert own assets"
  on public.user_assets for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own assets"
  on public.user_assets for update
  using ( auth.uid() = user_id );

create policy "Users can delete own assets"
  on public.user_assets for delete
  using ( auth.uid() = user_id );
create table if not exists public.push_subscriptions (
  token text primary key,
  user_id uuid references auth.users,
  favorite_currencies text[] default array[]::text[],
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies
create policy "Users can read own subscription"
  on public.push_subscriptions for select
  using ( auth.uid() = user_id or user_id is null );

create policy "Users can insert/update own subscription"
  on public.push_subscriptions for insert
  with check ( auth.uid() = user_id or user_id is null );

create policy "Users can update own subscription"
  on public.push_subscriptions for update
  using ( auth.uid() = user_id or user_id is null );

-- Allow anonymous access for now if needed, or rely on service role for edge functions
-- Ideally, the edge function uses service_role key to read all tokens.
