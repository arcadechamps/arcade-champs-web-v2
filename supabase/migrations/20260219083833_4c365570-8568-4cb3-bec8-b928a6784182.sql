-- Grant service_role full access to game_sessions to fix "permission denied" in edge functions
GRANT ALL ON public.game_sessions TO service_role;
GRANT ALL ON public.game_sessions TO authenticated;
