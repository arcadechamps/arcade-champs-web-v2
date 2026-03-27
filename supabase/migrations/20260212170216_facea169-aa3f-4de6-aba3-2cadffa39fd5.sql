
-- Grant table permissions to authenticated and anon roles
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.wallets TO authenticated;

GRANT SELECT, INSERT ON public.wallet_transactions TO authenticated;

GRANT SELECT ON public.contests TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contests TO authenticated;

GRANT SELECT ON public.games TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.games TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.game_sessions TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.contest_participants TO authenticated;

GRANT SELECT ON public.contest_winners TO anon, authenticated;
GRANT INSERT ON public.contest_winners TO authenticated;

GRANT SELECT ON public.contest_games TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.contest_games TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.anti_cheat_logs TO authenticated;

-- Add missing DELETE policies for admin
CREATE POLICY "contests_delete_admin" ON public.contests FOR DELETE
  USING (is_admin());

CREATE POLICY "games_delete_admin" ON public.games FOR DELETE
  USING (is_admin());

CREATE POLICY "contest_games_delete_admin" ON public.contest_games FOR DELETE
  USING (is_admin());
