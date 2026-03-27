
-- Add thumbnail_path column to games table
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS thumbnail_path text;

-- Create game-thumbnails storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-thumbnails', 'game-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for game thumbnails
CREATE POLICY "Game thumbnails are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-thumbnails');

-- Admin-only upload for game thumbnails
CREATE POLICY "Admins can upload game thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'game-thumbnails' AND public.is_admin());

-- Admin-only update for game thumbnails
CREATE POLICY "Admins can update game thumbnails"
ON storage.objects FOR UPDATE
USING (bucket_id = 'game-thumbnails' AND public.is_admin());

-- Admin-only delete for game thumbnails
CREATE POLICY "Admins can delete game thumbnails"
ON storage.objects FOR DELETE
USING (bucket_id = 'game-thumbnails' AND public.is_admin());
