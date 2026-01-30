-- Create daily_votes table
create table if not exists daily_votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  currency text not null default 'EUR',
  vote_type text not null check (vote_type in ('BULLISH', 'BEARISH')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Indexes
create index daily_votes_user_date_idx on daily_votes (user_id, ((created_at at time zone 'utc')::date));
create index daily_votes_date_idx on daily_votes (((created_at at time zone 'utc')::date));

-- Unique constraint to ensure one vote per user per currency per day
create unique index unique_daily_vote on daily_votes (user_id, currency, ((created_at at time zone 'utc')::date));

-- RLS Policies
alter table daily_votes enable row level security;

create policy "Users can insert their own vote"
  on daily_votes for insert
  with check (auth.uid() = user_id);

create policy "Users can view all votes (for aggregation)"
  on daily_votes for select
  using (true);

-- Optional: Create a view for easy aggregation of today's votes
create or replace view today_sentiment as
select
  currency,
  count(*) filter (where vote_type = 'BULLISH') as bullish_count,
  count(*) filter (where vote_type = 'BEARISH') as bearish_count,
  count(*) as total_votes
from daily_votes
where ((created_at at time zone 'utc')::date) = ((now() at time zone 'utc')::date)
group by currency;
