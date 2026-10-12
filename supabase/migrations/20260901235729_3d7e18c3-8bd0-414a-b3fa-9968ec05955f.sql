ALTER TABLE public.order_approvals
  ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.lab_appointments(id),
  ADD COLUMN IF NOT EXISTS decided_by uuid REFERENCES auth.users(id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS carrier text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz;

CREATE POLICY "Staff view approvals" ON public.order_approvals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'provider') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff decide approvals" ON public.order_approvals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'provider') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'provider') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Providers view orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'provider'));

CREATE POLICY "Providers view order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'provider'));

CREATE POLICY "Admins update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
