-- 1. Eligibility approvals may exist before an order is placed
ALTER TABLE public.order_approvals ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.order_approvals ADD COLUMN IF NOT EXISTS product_id text;
ALTER TABLE public.order_approvals ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE public.order_approvals ADD COLUMN IF NOT EXISTS patient_message text;
ALTER TABLE public.order_approvals ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS order_approvals_user_product_idx ON public.order_approvals (user_id, product_id);

DROP TRIGGER IF EXISTS order_approvals_updated_at ON public.order_approvals;
CREATE TRIGGER order_approvals_updated_at BEFORE UPDATE ON public.order_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New practitioner decision value
ALTER TYPE public.approval_status ADD VALUE IF NOT EXISTS 'more_info';

-- 2. Lab document review metadata
ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Staff review patient documents" ON public.patient_documents;
CREATE POLICY "Staff review patient documents"
  ON public.patient_documents FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'provider'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'provider'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Appointment types and configurable slot duration
ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'initial_consult';
ALTER TYPE public.appointment_type ADD VALUE IF NOT EXISTS 'follow_up';

ALTER TABLE public.provider_slots ADD COLUMN IF NOT EXISTS duration_minutes integer;
UPDATE public.provider_slots
  SET duration_minutes = GREATEST(5, ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)::int)
  WHERE duration_minutes IS NULL;
