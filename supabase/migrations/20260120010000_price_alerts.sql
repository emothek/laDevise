-- Create price_alerts table
create table if not exists price_alerts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  currency text not null,
  alert_type text not null check (alert_type in ('FIXED', 'VOLATILITY')),
  threshold_value numeric not null,
  comparison text not null check (comparison in ('ABOVE', 'BELOW', 'CHANGE')),
  is_active boolean default true not null,
  last_triggered_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes
create index price_alerts_user_id_idx on price_alerts (user_id);
create index price_alerts_active_idx on price_alerts (is_active) where is_active = true;

-- RLS Policies
alter table price_alerts enable row level security;

create policy "Users can view their own alerts"
  on price_alerts for select
  using (auth.uid() = user_id);

create policy "Users can create their own alerts"
  on price_alerts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own alerts"
  on price_alerts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own alerts"
  on price_alerts for delete
  using (auth.uid() = user_id);
