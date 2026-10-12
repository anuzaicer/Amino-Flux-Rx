-- appointment type
DO $$ BEGIN
  CREATE TYPE public.appointment_type AS ENUM ('lab_review','treatment_approval');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.lab_appointments
  ADD COLUMN IF NOT EXISTS appointment_type public.appointment_type NOT NULL DEFAULT 'lab_review';

-- quest fulfillment status
DO $$ BEGIN
  CREATE TYPE public.quest_status AS ENUM ('awaiting_setup','ready','results_received');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.lab_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.quest_status NOT NULL DEFAULT 'awaiting_setup',
  quest_reference text,
  quest_link text,
  admin_note text,
  ready_at timestamptz,
  ready_by uuid,
  results_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.lab_fulfillments TO authenticated;
GRANT ALL ON public.lab_fulfillments TO service_role;
ALTER TABLE public.lab_fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients view their own lab fulfillment"
  ON public.lab_fulfillments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update lab fulfillment"
  ON public.lab_fulfillments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert lab fulfillment"
  ON public.lab_fulfillments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER lab_fulfillments_updated_at
  BEFORE UPDATE ON public.lab_fulfillments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-create a fulfillment row when a lab item is added to an order
CREATE OR REPLACE FUNCTION public.create_lab_fulfillment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_group = 'labs' THEN
    INSERT INTO public.lab_fulfillments (order_id, user_id)
    VALUES (NEW.order_id, NEW.user_id)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS order_items_create_lab_fulfillment ON public.order_items;
CREATE TRIGGER order_items_create_lab_fulfillment
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.create_lab_fulfillment();

-- admin visibility
CREATE POLICY "Admins view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
