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
