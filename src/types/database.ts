// Enums matching the actual Supabase database
export type CheatStatus = 'clean' | 'suspected' | 'confirmed';
export type ContestStatus = 'upcoming' | 'active' | 'closed';
export type SessionStatus = 'active' | 'ended' | 'flagged';
export type TxType = 'topup' | 'session_fee' | 'payout' | 'admin_adjust';
export type TxStatus = 'pending' | 'succeeded' | 'failed';

export type PayoutMethod = 'paypal' | 'venmo' | 'cashapp';
export type FulfillmentStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'emailed';

export interface Profile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  avatar_url?: string | null;
  payout_method: PayoutMethod | null;
  payout_handle: string | null;
  shipping_address: string | null;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  is_active: boolean;
  core: string;
  description: string | null;
  rom_path: string | null;
  thumbnail_path: string | null;
  keymapping: Record<string, unknown> | null;
  created_at: string;
}

export interface Contest {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: ContestStatus;
  session_fee_cents: number;
  session_duration_seconds: number;
  prize_cents: number;
  prize_description: string | null;
  prize_image_path: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ContestGame {
  contest_id: string;
  game_id: string;
  is_active: boolean;
  sort_order: number;
}

export interface ContestParticipant {
  contest_id: string;
  user_id: string;
  joined_at: string;
  is_banned: boolean;
  ban_reason: string | null;
}

export interface ContestWinner {
  contest_id: string;
  user_id: string;
  winning_score: number;
  payout_cents: number;
  paid: boolean;
  fulfillment_status: FulfillmentStatus;
  fulfillment_notes: string | null;
  declared_by: string | null;
  declared_at: string;
}

export interface GameSession {
  id: string;
  session_id: string;
  user_id: string;
  contest_id: string;
  game_id: string;
  status: SessionStatus;
  start_timestamp_ms: number;
  end_timestamp_ms: number | null;
  started_at: string;
  ended_at: string | null;
  allowed_duration_seconds: number;
  score: number | null;
  screenshot_path: string | null;
  recording_path: string | null;
  created_at: string;
}

export interface Wallet {
  user_id: string;
  balance_cents: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: TxType;
  status: TxStatus;
  amount_cents: number;
  currency: string;
  contest_id: string | null;
  session_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface AntiCheatLog {
  id: string;
  session_id: string;
  user_id: string;
  contest_id: string;
  game_id: string;
  status: CheatStatus;
  reason: string | null;
  evidence: Record<string, unknown> | null;
  created_at: string;
}
