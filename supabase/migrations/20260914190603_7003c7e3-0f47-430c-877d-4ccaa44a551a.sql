ALTER TABLE public.order_approvals
  ADD COLUMN IF NOT EXISTS patient_confirmed_at timestamptz;

COMMENT ON COLUMN public.order_approvals.patient_confirmed_at IS
  'Set only when the patient explicitly confirms this treatment option on its product page.';
