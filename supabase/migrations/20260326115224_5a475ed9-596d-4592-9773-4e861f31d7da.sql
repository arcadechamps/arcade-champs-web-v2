
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
  _limit INT DEFAULT 10,
  _offset INT DEFAULT 0,
  _contest_id UUID DEFAULT NULL,
  _game_id UUID DEFAULT NULL,
  _search TEXT DEFAULT NULL
)
RETURNS TABLE(
  rank BIGINT,
  user_id UUID,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  best_score BIGINT,
  contest_id UUID,
  contest_title TEXT,
  game_id UUID,
  game_title TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  WITH ranked AS (
    SELECT
      gs.user_id,
      gs.contest_id,
      gs.game_id,
      MAX(gs.score) AS best_score
    FROM public.game_sessions gs
    JOIN public.contests c ON c.id = gs.contest_id
    WHERE gs.score IS NOT NULL
      AND gs.score > 0
      AND gs.status IN ('ended', 'active')
      AND c.status IN ('active', 'closed')
      AND (_contest_id IS NULL OR gs.contest_id = _contest_id)
      AND (_game_id IS NULL OR gs.game_id = _game_id)
    GROUP BY gs.user_id, gs.contest_id, gs.game_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY r.best_score DESC) AS rank,
    r.user_id,
    p.display_name,
    p.username,
    p.avatar_url,
    r.best_score,
    r.contest_id,
    c.title AS contest_title,
    r.game_id,
    g.title AS game_title
  FROM ranked r
  JOIN public.profiles p ON p.user_id = r.user_id
  JOIN public.contests c ON c.id = r.contest_id
  JOIN public.games g ON g.id = r.game_id
  WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.username ILIKE '%' || _search || '%')
  ORDER BY r.best_score DESC
  LIMIT _limit
  OFFSET _offset;
$$;

CREATE OR REPLACE FUNCTION public.get_global_leaderboard_count(
  _contest_id UUID DEFAULT NULL,
  _game_id UUID DEFAULT NULL,
  _search TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)
  FROM (
    SELECT gs.user_id, gs.contest_id, gs.game_id
    FROM public.game_sessions gs
    JOIN public.contests c ON c.id = gs.contest_id
    WHERE gs.score IS NOT NULL
      AND gs.score > 0
      AND gs.status IN ('ended', 'active')
      AND c.status IN ('active', 'closed')
      AND (_contest_id IS NULL OR gs.contest_id = _contest_id)
      AND (_game_id IS NULL OR gs.game_id = _game_id)
    GROUP BY gs.user_id, gs.contest_id, gs.game_id
  ) sub
  JOIN public.profiles p ON p.user_id = sub.user_id
  WHERE (_search IS NULL OR p.display_name ILIKE '%' || _search || '%' OR p.username ILIKE '%' || _search || '%');
$$;
