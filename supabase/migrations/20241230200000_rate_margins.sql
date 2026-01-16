-- Ensure profiles table exists (required for admin policies)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'user' check (role in ('user', 'admin', 'super_admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Basic profile policies if they don't exist
do $$ 
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can read own profile') then
    create policy "Users can read own profile" on public.profiles for select using ( auth.uid() = id );
  end if;
end $$;

-- Trigger to create profile on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute procedure public.handle_new_user();
  end if;
end $$;

-- Create rate_margins table to store the fixed addition for parallel rates
create table if not exists public.rate_margins (
  currency text primary key,
  buy_margin numeric not null default 0,
  sell_margin numeric not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.rate_margins enable row level security;

-- Policies
create policy "Margins are public"
  on public.rate_margins for select
  using ( true );

create policy "Admins can manage margins"
  on public.rate_margins for all
  using ( 
    auth.uid() in (select id from public.profiles where role in ('admin', 'super_admin'))
  );

-- Seed initial values
-- As requested: EUR margin is 123.67
insert into public.rate_margins (currency, buy_margin, sell_margin)
values 
  ('EUR', 123.67, 122.67),
  ('USD', 110.50, 109.50),
  ('GBP', 140.00, 138.00),
  ('CAD', 80.00, 78.00),
  ('CHF', 130.00, 128.00),
  ('TRY', 3.50, 3.20),
  ('CNY', 15.00, 14.00),
  ('SAR', 28.00, 27.00),
  ('AED', 29.00, 28.00)
on conflict (currency) do update set
  buy_margin = excluded.buy_margin,
  sell_margin = excluded.sell_margin,
  updated_at = now();
