/*
  Enable pg_cron and pg_net extensions to schedule the daily fetch-rates job.
  Run this SQL in your Supabase Dashboard SQL Editor.
*/

-- 1. Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Schedule the job (Daily at 9:00 AM UTC - approx 10:00 AM Algeria)
-- NOTE: The URL must be your specific Edge Function URL.
-- Replace 'https://jfhalmsenxfffaakehjq.supabase.co/functions/v1/fetch-rates' with your actual URL if different.
-- Since the function is deployed with --no-verify-jwt, we don't stricly need the Authorization header,
-- but it's good practice to fetch with POST method if configured, or GET. 
-- The function supports GET/POST in the standard serve handler?
-- Actually, our serve handler doesn't check method, so GET or POST is fine.
-- pg_net.http_post is reliable.

select cron.schedule(
  'fetch-rates-daily', -- Job name
  '0 9 * * *',         -- Schedule (9:00 AM daily)
  $$
  select
    net.http_post(
        url:='https://jfhalmsenxfffaakehjq.supabase.co/functions/v1/fetch-rates',
        headers:='{"Content-Type": "application/json"}'::jsonb
    ) as request_id;
  $$
);

-- To verify the job is scheduled:
-- select * from cron.job;

-- To check logs:
-- select * from net.http_request_queue;
