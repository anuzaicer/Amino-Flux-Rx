ALTER TABLE public.provider_slots ADD COLUMN IF NOT EXISTS external_id text;
CREATE UNIQUE INDEX IF NOT EXISTS provider_slots_external_id_key ON public.provider_slots(external_id) WHERE external_id IS NOT NULL;
