DROP INDEX IF EXISTS public.provider_slots_external_id_key;
ALTER TABLE public.provider_slots ADD CONSTRAINT provider_slots_external_id_key UNIQUE (external_id);
