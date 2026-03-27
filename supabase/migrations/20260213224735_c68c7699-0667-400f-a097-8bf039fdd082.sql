
-- Storage policies for game-roms bucket (matching game-thumbnails pattern)
CREATE POLICY "Game ROMs are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-roms');

CREATE POLICY "Admins can upload game ROMs"
ON storage.objects FOR INSERT
WITH CHECK ((bucket_id = 'game-roms') AND is_admin());

CREATE POLICY "Admins can update game ROMs"
ON storage.objects FOR UPDATE
USING ((bucket_id = 'game-roms') AND is_admin());

CREATE POLICY "Admins can delete game ROMs"
ON storage.objects FOR DELETE
USING ((bucket_id = 'game-roms') AND is_admin());
