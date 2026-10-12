CREATE POLICY "No client access to notification log"
ON public.notification_log
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);
