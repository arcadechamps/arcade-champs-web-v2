
-- Create private bucket for gameplay screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('gameplay-screenshots', 'gameplay-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Admin can read all screenshots
CREATE POLICY "Admin can read screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'gameplay-screenshots' AND public.is_admin());

-- Users can upload their own screenshots (folder = user_id)
CREATE POLICY "Users upload own screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gameplay-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
