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
