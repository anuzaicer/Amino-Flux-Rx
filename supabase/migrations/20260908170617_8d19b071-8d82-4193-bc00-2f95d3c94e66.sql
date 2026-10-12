CREATE TABLE public.notification_log (
  event_key text PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.notification_log TO service_role;

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
