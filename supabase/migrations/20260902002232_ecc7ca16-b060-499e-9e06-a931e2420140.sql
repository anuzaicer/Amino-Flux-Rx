CREATE POLICY "Patients read own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(), 'provider')
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Patients upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Patients update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Patients delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'patient-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
