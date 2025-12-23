-- Create a table for commodities (Gold, Silver)
create table public.commodities (
  id uuid default gen_random_uuid() primary key,
  name text not null, -- 'Gold 18k', 'Gold 24k', 'Silver'
  price_gram_usd numeric not null,
  price_gram_dzd numeric not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for commodities
alter table public.commodities enable row level security;

-- Public read access for commodities
create policy "Commodities are public"
  on public.commodities for select
  using ( true );

-- Create profiles table to extend auth.users
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'user' check (role in ('user', 'admin', 'super_admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Profiles are readable by the user themselves or admins
create policy "Users can read own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Admins can read all profiles"
  on public.profiles for select
  using ( 
    auth.uid() in (select id from public.profiles where role in ('admin', 'super_admin'))
  );

-- Only admins can insert/update rates and commodities
-- (This assumes we also apply this policy to the 'rates' table created earlier)
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
