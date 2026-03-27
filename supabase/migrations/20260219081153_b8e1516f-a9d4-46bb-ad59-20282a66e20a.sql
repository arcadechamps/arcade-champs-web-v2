
-- Add recording_path column to game_sessions
ALTER TABLE public.game_sessions
ADD COLUMN recording_path TEXT DEFAULT NULL;

-- Create gameplay-recordings bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gameplay-recordings', 'gameplay-recordings', false);

-- Admin can read recordings
CREATE POLICY "Admin can read recordings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gameplay-recordings' AND public.is_admin());
