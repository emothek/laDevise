-- Add phone column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- Add phone_number and contact_preference to market_offers
ALTER TABLE public.market_offers 
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS contact_preference text DEFAULT 'email' CHECK (contact_preference IN ('email', 'phone', 'both'));

-- Add settled_at and canceled_at to market_requests (or rely on status, but timestamps are good for history)
-- Actually, status is enough for now as we have 'ACCEPTED' and 'REJECTED'. 
-- But user asked for "Settled" or "Canceled" AFTER acceptance.
-- So we might need a status update on market_offers or market_requests.
-- Let's update market_offers status to include 'COMPLETED' (already there) and add a way to link it to a specific request if needed.
-- But the request itself is just an entry point. 
-- Let's add a 'completion_status' to market_requests for post-acceptance tracking if we want granular tracking per request, 
-- or just use the offer's status. 
-- The user said: "when offer is accepted the posting person should confirm if it is settled or canceled".
-- This implies the OFFER status changes. 
-- Existing status constraint: CHECK (status = ANY (ARRAY['ACTIVE'::text, 'COMPLETED'::text, 'EXPIRED'::text, 'DELETED'::text]))
-- We can stick to that. 
-- But we might want to know WHICH request settled it. 
ALTER TABLE public.market_offers
ADD COLUMN IF NOT EXISTS settled_request_id uuid REFERENCES public.market_requests(id);

-- Update RLS to allow reading phone numbers if needed, but we control this via API logic mostly.
-- (Existing policies are broad enough for select, we mask on client/service side currently, which is not ideal security but workable for MVP)
