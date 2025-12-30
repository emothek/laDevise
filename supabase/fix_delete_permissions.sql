-- 1. Add DELETE policy for market_requests so users can delete their own requests
-- Drop first to avoid errors if it exists (or ignore error)
DROP POLICY IF EXISTS "Users can delete own requests" ON public.market_requests;
CREATE POLICY "Users can delete own requests"
  ON public.market_requests FOR DELETE
  USING ( auth.uid() = requester_id );

-- 2. Add DELETE policy for market_offers (Requested)
-- Ensure users can delete their own offers
DROP POLICY IF EXISTS "Users can delete own offers" ON public.market_offers;
CREATE POLICY "Users can delete own offers"
  ON public.market_offers FOR DELETE
  USING ( auth.uid() = user_id );

-- 3. Modify Foreign Key to Cascade Delete (Essential for Hard Delete)
-- This allows deleting an Offer to automatically delete all associated Requests
ALTER TABLE public.market_requests
  DROP CONSTRAINT IF EXISTS market_requests_offer_id_fkey;

ALTER TABLE public.market_requests
  ADD CONSTRAINT market_requests_offer_id_fkey
    FOREIGN KEY (offer_id)
    REFERENCES public.market_offers(id)
    ON DELETE CASCADE;
