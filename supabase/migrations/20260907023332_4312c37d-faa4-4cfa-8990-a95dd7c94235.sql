ALTER TABLE public.lab_fulfillments
  ADD COLUMN IF NOT EXISTS draw_booked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS draw_completed_at timestamptz NULL;
