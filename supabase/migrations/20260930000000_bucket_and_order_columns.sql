-- Columns that were added to the Lovable Cloud database through drizzle/migrations
-- (0000_add_order_payment_provider_columns.sql, 0001_orders_completed_at.sql)
-- rather than supabase/migrations. Included here so `supabase db push` creates
-- the full schema on a new project.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_ref text;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;
COMMENT ON COLUMN public.orders.completed_at IS 'When an admin marked the order completed (triggers the thank-you email once).';

-- The private bucket for patient documents (photo IDs, lab reports) was created
-- by Lovable Cloud outside the migrations. Same settings as the original.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('patient-documents', 'patient-documents', false, 10000000)
ON CONFLICT (id) DO NOTHING;
