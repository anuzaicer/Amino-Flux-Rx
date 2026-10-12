CREATE POLICY "Staff view patient documents"
ON public.patient_documents
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'provider') OR public.has_role(auth.uid(), 'admin'));
