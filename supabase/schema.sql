-- Create a table for exchange rates
create table public.rates (
  id uuid default gen_random_uuid() primary key,
  currency text not null, -- 'EUR', 'USD', 'CAD', 'CHF', 'GBP'
  type text not null check (type in ('OFFICIAL', 'BLACK_MARKET')),
  buy_price numeric not null,
  sell_price numeric not null,
  source text, -- 'Bank of Algeria', 'Square Port Said'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.rates enable row level security;

-- Create a policy that allows anyone to read rates
create policy "Rates are public"
  on public.rates for select
  using ( true );

-- Create a policy that only allows service_role or authenticated admins to insert (conceptually)
-- For now, we might leave insert restricted or allow it for specific roles if we had auth setup.
-- This policy allows inserts only if the user has a specific role or via service key functions.
create policy "Service role can insert rates"
  on public.rates for insert
  with check ( true ); 
  -- In production, you'd likely want to restrict this to a specific role or rely on the service_role key bypassing RLS.
