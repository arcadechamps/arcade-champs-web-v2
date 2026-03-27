-- Drop the old overloads that don't accept filter parameters
DROP FUNCTION IF EXISTS public.get_global_leaderboard(integer, integer);
DROP FUNCTION IF EXISTS public.get_global_leaderboard_count();