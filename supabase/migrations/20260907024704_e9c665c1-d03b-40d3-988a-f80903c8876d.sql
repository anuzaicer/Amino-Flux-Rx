CREATE TABLE public.care_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('patient','staff')),
  body text NOT NULL,
  read_by_patient boolean NOT NULL DEFAULT false,
  read_by_staff boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.care_messages TO authenticated;
GRANT ALL ON public.care_messages TO service_role;

ALTER TABLE public.care_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX care_messages_patient_created_idx ON public.care_messages (patient_id, created_at);
CREATE INDEX care_messages_staff_unread_idx ON public.care_messages (created_at DESC) WHERE read_by_staff = false AND sender_role = 'patient';

CREATE POLICY "Patients view their own messages"
  ON public.care_messages FOR SELECT TO authenticated
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients send their own messages"
  ON public.care_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id AND auth.uid() = sender_id AND sender_role = 'patient');

CREATE POLICY "Staff view all messages"
  ON public.care_messages FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'provider'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff send replies"
  ON public.care_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND sender_role = 'staff'
    AND (has_role(auth.uid(), 'provider'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );
