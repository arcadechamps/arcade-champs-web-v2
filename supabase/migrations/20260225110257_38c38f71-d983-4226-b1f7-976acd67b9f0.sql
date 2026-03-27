
-- Storage RLS policies for gameplay-recordings bucket
CREATE POLICY "Users can read own recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gameplay-recordings' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "Admins can read all recordings"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gameplay-recordings' AND public.is_admin());

CREATE POLICY "Users can upload own recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gameplay-recordings' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- Storage RLS policies for gameplay-screenshots bucket
CREATE POLICY "Users can read own screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gameplay-screenshots' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "Admins can read all screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gameplay-screenshots' AND public.is_admin());

CREATE POLICY "Users can upload own screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gameplay-screenshots' AND (auth.uid()::text = (storage.foldername(name))[1]));
