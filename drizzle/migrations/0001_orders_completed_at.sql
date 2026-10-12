ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;
COMMENT ON COLUMN public.orders.completed_at IS 'When an admin marked the order completed (triggers the thank-you email once).';
