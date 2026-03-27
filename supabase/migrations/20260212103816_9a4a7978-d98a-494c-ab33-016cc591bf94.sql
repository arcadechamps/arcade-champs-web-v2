
-- Fix: All policies were created as RESTRICTIVE which blocks all access.
-- PostgreSQL requires at least one PERMISSIVE policy. Drop restrictive ones, recreate as permissive.

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT
  WITH CHECK (is_admin());

-- WALLETS
DROP POLICY IF EXISTS "wallets_select" ON public.wallets;
DROP POLICY IF EXISTS "wallets_write_admin" ON public.wallets;

CREATE POLICY "wallets_select" ON public.wallets FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "wallets_write_admin" ON public.wallets FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- WALLET_TRANSACTIONS
DROP POLICY IF EXISTS "wallet_tx_select" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_insert" ON public.wallet_transactions;
DROP POLICY IF EXISTS "wallet_tx_update_admin" ON public.wallet_transactions;

CREATE POLICY "wallet_tx_select" ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "wallet_tx_insert" ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "wallet_tx_update_admin" ON public.wallet_transactions FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- CONTESTS
DROP POLICY IF EXISTS "contests_select_public" ON public.contests;
DROP POLICY IF EXISTS "contests_admin_write" ON public.contests;

CREATE POLICY "contests_select_public" ON public.contests FOR SELECT
  USING (true);

CREATE POLICY "contests_admin_write" ON public.contests FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- GAMES
DROP POLICY IF EXISTS "games_select_public" ON public.games;
DROP POLICY IF EXISTS "games_admin_write" ON public.games;

CREATE POLICY "games_select_public" ON public.games FOR SELECT
  USING (true);

CREATE POLICY "games_admin_write" ON public.games FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- GAME_SESSIONS
DROP POLICY IF EXISTS "sessions_select" ON public.game_sessions;
DROP POLICY IF EXISTS "sessions_insert" ON public.game_sessions;
DROP POLICY IF EXISTS "sessions_update" ON public.game_sessions;

CREATE POLICY "sessions_select" ON public.game_sessions FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "sessions_insert" ON public.game_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "sessions_update" ON public.game_sessions FOR UPDATE
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- CONTEST_PARTICIPANTS
DROP POLICY IF EXISTS "participants_select" ON public.contest_participants;
DROP POLICY IF EXISTS "participants_insert" ON public.contest_participants;
DROP POLICY IF EXISTS "participants_update_admin" ON public.contest_participants;

CREATE POLICY "participants_select" ON public.contest_participants FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "participants_insert" ON public.contest_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "participants_update_admin" ON public.contest_participants FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- CONTEST_WINNERS
DROP POLICY IF EXISTS "winners_select_public" ON public.contest_winners;
DROP POLICY IF EXISTS "winners_admin_write" ON public.contest_winners;

CREATE POLICY "winners_select_public" ON public.contest_winners FOR SELECT
  USING (true);

CREATE POLICY "winners_admin_write" ON public.contest_winners FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- CONTEST_GAMES
DROP POLICY IF EXISTS "contest_games_select_public" ON public.contest_games;
DROP POLICY IF EXISTS "contest_games_admin_write" ON public.contest_games;

CREATE POLICY "contest_games_select_public" ON public.contest_games FOR SELECT
  USING (true);

CREATE POLICY "contest_games_admin_write" ON public.contest_games FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ANTI_CHEAT_LOGS
DROP POLICY IF EXISTS "cheat_select" ON public.anti_cheat_logs;
DROP POLICY IF EXISTS "cheat_insert" ON public.anti_cheat_logs;
DROP POLICY IF EXISTS "cheat_update_admin" ON public.anti_cheat_logs;

CREATE POLICY "cheat_select" ON public.anti_cheat_logs FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "cheat_insert" ON public.anti_cheat_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id OR is_admin());

CREATE POLICY "cheat_update_admin" ON public.anti_cheat_logs FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
