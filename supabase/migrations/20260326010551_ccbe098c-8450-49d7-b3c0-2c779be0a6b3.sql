
CREATE OR REPLACE FUNCTION public.get_contest_leaderboard(
  _contest_id UUID,
  _limit INT DEFAULT 10
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  best_score BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY MAX(gs.score) DESC) AS rank,
    gs.user_id,
    p.display_name,
    p.username,
    p.avatar_url,
    MAX(gs.score) AS best_score
  FROM public.game_sessions gs
  JOIN public.profiles p ON p.user_id = gs.user_id
  WHERE gs.contest_id = _contest_id
    AND gs.score IS NOT NULL
    AND gs.status IN ('ended', 'active')
  GROUP BY gs.user_id, p.display_name, p.username, p.avatar_url
  ORDER BY best_score DESC
  LIMIT _limit;
$$;
