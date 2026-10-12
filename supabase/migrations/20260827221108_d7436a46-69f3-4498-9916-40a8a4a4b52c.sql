CREATE TYPE public.order_status AS ENUM ('pending_payment','paid','in_review','approved','denied','fulfilled','cancelled');
CREATE TYPE public.approval_status AS ENUM ('pending','approved','denied');
CREATE TYPE public.refill_status AS ENUM ('requested','approved','denied','fulfilled');
CREATE TYPE public.document_status AS ENUM ('pending_review','verified','rejected');

CREATE TABLE public.patient_intakes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  date_of_birth DATE,
  biological_sex TEXT,
  height_in INTEGER,
  weight_lb INTEGER,
  allergies TEXT,
  medications TEXT,
  conditions TEXT,
  pregnancy_status TEXT,
  goals TEXT,
  shipping_name TEXT,
  shipping_address1 TEXT,
  shipping_address2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_intakes TO authenticated;
GRANT ALL ON public.patient_intakes TO service_role;
ALTER TABLE public.patient_intakes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own intake" ON public.patient_intakes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.consent_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_slug TEXT NOT NULL,
  consent_title TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  signed_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, consent_slug, version)
);
GRANT SELECT, INSERT ON public.consent_signatures TO authenticated;
GRANT ALL ON public.consent_signatures TO service_role;
ALTER TABLE public.consent_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own consents" ON public.consent_signatures FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users sign their own consents" ON public.consent_signatures FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'photo_id',
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status public.document_status NOT NULL DEFAULT 'pending_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.patient_documents TO authenticated;
GRANT ALL ON public.patient_documents TO service_role;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own documents" ON public.patient_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE DEFAULT ('AF-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  requires_labs BOOLEAN NOT NULL DEFAULT false,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  shipping_name TEXT,
  shipping_address1 TEXT,
  shipping_address2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_group TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  requires_labs BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own order items" ON public.order_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.order_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.approval_status NOT NULL DEFAULT 'pending',
  provider_note TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_approvals TO authenticated;
GRANT ALL ON public.order_approvals TO service_role;
ALTER TABLE public.order_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own approvals" ON public.order_approvals FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.refill_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  status public.refill_status NOT NULL DEFAULT 'requested',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.refill_requests TO authenticated;
GRANT ALL ON public.refill_requests TO service_role;
ALTER TABLE public.refill_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own refill requests" ON public.refill_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their own refill requests" ON public.refill_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER patient_intakes_updated_at BEFORE UPDATE ON public.patient_intakes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
