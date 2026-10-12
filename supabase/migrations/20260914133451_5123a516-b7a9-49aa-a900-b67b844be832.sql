ALTER TABLE public.patient_documents ADD COLUMN IF NOT EXISTS for_product_id text;
ALTER TABLE public.lab_fulfillments ADD COLUMN IF NOT EXISTS for_product_id text;
ALTER TABLE public.lab_appointments ADD COLUMN IF NOT EXISTS for_product_id text;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS for_product_id text;

CREATE OR REPLACE FUNCTION public.create_lab_fulfillment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.product_group = 'labs' THEN
    INSERT INTO public.lab_fulfillments (order_id, user_id, for_product_id)
    VALUES (NEW.order_id, NEW.user_id, NEW.for_product_id)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
