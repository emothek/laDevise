-- Market Offers Table
create table if not exists public.market_offers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
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
