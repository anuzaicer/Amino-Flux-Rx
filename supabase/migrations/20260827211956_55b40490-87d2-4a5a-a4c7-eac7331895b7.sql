CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, gender_preference)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'gender_preference' IN ('men', 'women')
      THEN NEW.raw_user_meta_data->>'gender_preference'
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$function$;
