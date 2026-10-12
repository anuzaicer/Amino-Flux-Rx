ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz NULL;
