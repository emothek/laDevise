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
-- Market Offers Table
create table if not exists public.market_offers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  type text not null check (type in ('OFFER', 'REQUEST')), -- Offer to sell, Request to buy
  currency_from text not null, -- e.g. 'EUR'
  currency_to text not null default 'DZD',
  amount numeric not null,
  min_amount numeric, -- Optional minimum trade size
  rate numeric, -- Exchange rate offered
  payment_methods text[] not null, -- ['Cash', 'Wise', 'BaridiMob', etc.]
  wilaya text, -- For physical meetups
  commune text,
  expires_at timestamp with time zone,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'EXPIRED', 'DELETED')),
  contact_info_hidden boolean default true, -- Per user request
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.market_offers enable row level security;

-- Policies
create policy "Offers are public"
  on public.market_offers for select
  using ( status = 'ACTIVE' and (expires_at is null or expires_at > now()) );

create policy "Users can insert own offers"
  on public.market_offers for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own offers"
  on public.market_offers for update
  using ( auth.uid() = user_id );

create policy "Users can delete own offers"
  on public.market_offers for delete
  using ( auth.uid() = user_id );
-- Market Requests Table (Negotiation)
create table if not exists public.market_requests (
  id uuid default gen_random_uuid() primary key,
  offer_id uuid references public.market_offers(id) not null,
  requester_id uuid references public.profiles(id) not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED')),
  proposed_rate numeric not null,
  proposed_amount numeric not null,
  proposed_location text,
  payment_method text, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.market_requests enable row level security;

-- Policies

-- Requester can see their own requests
create policy "Users can see own requests"
  on public.market_requests for select
  using ( auth.uid() = requester_id );

-- Offer Owner can see requests for their offers
create policy "Owners can see incoming requests"
  on public.market_requests for select
  using ( 
    exists (
      select 1 from public.market_offers 
      where id = market_requests.offer_id 
      and user_id = auth.uid()
    ) 
  );

-- Users can insert requests
create policy "Users can insert requests"
  on public.market_requests for insert
  with check ( auth.uid() = requester_id );

-- Offer Owner can update status (Accept/Reject)
create policy "Owners can update requests"
  on public.market_requests for update
  using ( 
    exists (
      select 1 from public.market_offers 
      where id = market_requests.offer_id 
      and user_id = auth.uid()
    ) 
  );

-- [NEW] Market Enhancements
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.market_offers ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.market_offers ADD COLUMN IF NOT EXISTS contact_preference text DEFAULT 'email' CHECK (contact_preference IN ('email', 'phone', 'both'));
ALTER TABLE public.market_offers ADD COLUMN IF NOT EXISTS settled_request_id uuid REFERENCES public.market_requests(id);
