
CREATE TYPE public.app_role AS ENUM ('admin','provider','patient');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TYPE public.slot_status AS ENUM ('open','booked','cancelled');
CREATE TYPE public.appointment_status AS ENUM ('scheduled','completed','cancelled','no_show');
CREATE TYPE public.lab_source AS ENUM ('uploaded','purchased');

CREATE TABLE public.provider_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL DEFAULT 'Nurse Practitioner',
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  meeting_mode TEXT NOT NULL DEFAULT 'zoom',
  status public.slot_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, slot_date, start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_slots TO authenticated;
GRANT ALL ON public.provider_slots TO service_role;
ALTER TABLE public.provider_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can view slots" ON public.provider_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Providers manage their own slots" ON public.provider_slots FOR ALL TO authenticated
  USING (auth.uid() = provider_id AND (public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'admin')))
  WITH CHECK (auth.uid() = provider_id AND (public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'admin')));

CREATE TABLE public.lab_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL UNIQUE REFERENCES public.provider_slots(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  lab_source public.lab_source NOT NULL DEFAULT 'uploaded',
  patient_name TEXT,
  patient_phone TEXT,
  contact_preference TEXT NOT NULL DEFAULT 'zoom',
  notes TEXT,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.lab_appointments TO authenticated;
GRANT ALL ON public.lab_appointments TO service_role;
ALTER TABLE public.lab_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients view their own appointments" ON public.lab_appointments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Patients book their own appointments" ON public.lab_appointments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Patients or staff update appointments" ON public.lab_appointments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'provider') OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS lab_source public.lab_source;

CREATE TRIGGER provider_slots_updated_at BEFORE UPDATE ON public.provider_slots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER lab_appointments_updated_at BEFORE UPDATE ON public.lab_appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_appointments;
