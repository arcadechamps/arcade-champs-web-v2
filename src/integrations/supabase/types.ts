export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      anti_cheat_logs: {
        Row: {
          contest_id: string
          created_at: string
          evidence: Json | null
          game_id: string
          id: string
          reason: string | null
          session_id: string
          status: Database["public"]["Enums"]["cheat_status"]
          user_id: string
        }
        Insert: {
          contest_id: string
          created_at?: string
          evidence?: Json | null
          game_id: string
          id?: string
          reason?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["cheat_status"]
          user_id: string
        }
        Update: {
          contest_id?: string
          created_at?: string
          evidence?: Json | null
          game_id?: string
          id?: string
          reason?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["cheat_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anti_cheat_logs_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anti_cheat_logs_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anti_cheat_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "anti_cheat_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contest_games: {
        Row: {
          contest_id: string
          game_id: string
          is_active: boolean
          sort_order: number
        }
        Insert: {
          contest_id: string
          game_id: string
          is_active?: boolean
          sort_order?: number
        }
        Update: {
          contest_id?: string
          game_id?: string
          is_active?: boolean
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_games_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_participants: {
        Row: {
          ban_reason: string | null
          contest_id: string
          is_banned: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          ban_reason?: string | null
          contest_id: string
          is_banned?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          ban_reason?: string | null
          contest_id?: string
          is_banned?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_participants_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contest_winners: {
        Row: {
          contest_id: string
          declared_at: string
          declared_by: string | null
          paid: boolean
          payout_cents: number
          user_id: string
          winning_score: number
        }
        Insert: {
          contest_id: string
          declared_at?: string
          declared_by?: string | null
          paid?: boolean
          payout_cents?: number
          user_id: string
          winning_score?: number
        }
        Update: {
          contest_id?: string
          declared_at?: string
          declared_by?: string | null
          paid?: boolean
          payout_cents?: number
          user_id?: string
          winning_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_winners_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: true
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_winners_declared_by_fkey"
            columns: ["declared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "contest_winners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      contests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          prize_cents: number
          prize_image_path: string | null
          session_duration_seconds: number
          session_fee_cents: number
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["contest_status"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          prize_cents?: number
          prize_image_path?: string | null
          session_duration_seconds?: number
          session_fee_cents?: number
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["contest_status"]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          prize_cents?: number
          prize_image_path?: string | null
          session_duration_seconds?: number
          session_fee_cents?: number
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["contest_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          allowed_duration_seconds: number
          contest_id: string
          created_at: string
          end_timestamp_ms: number | null
          ended_at: string | null
          game_id: string
          id: string
          recording_path: string | null
          score: number | null
          screenshot_count: number | null
          screenshot_path: string | null
          session_id: string
          start_timestamp_ms: number
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          user_id: string
        }
        Insert: {
          allowed_duration_seconds: number
          contest_id: string
          created_at?: string
          end_timestamp_ms?: number | null
          ended_at?: string | null
          game_id: string
          id?: string
          recording_path?: string | null
          score?: number | null
          screenshot_count?: number | null
          screenshot_path?: string | null
          session_id: string
          start_timestamp_ms: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          user_id: string
        }
        Update: {
          allowed_duration_seconds?: number
          contest_id?: string
          created_at?: string
          end_timestamp_ms?: number | null
          ended_at?: string | null
          game_id?: string
          id?: string
          recording_path?: string | null
          score?: number | null
          screenshot_count?: number | null
          screenshot_path?: string | null
          session_id?: string
          start_timestamp_ms?: number
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      games: {
        Row: {
          core: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          keymapping: Json | null
          rom_path: string | null
          slug: string
          thumbnail_path: string | null
          title: string
        }
        Insert: {
          core?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          keymapping?: Json | null
          rom_path?: string | null
          slug: string
          thumbnail_path?: string | null
          title: string
        }
        Update: {
          core?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          keymapping?: Json | null
          rom_path?: string | null
          slug?: string
          thumbnail_path?: string | null
          title?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          is_admin: boolean
          payout_handle: string | null
          payout_method: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          is_admin?: boolean
          payout_handle?: string | null
          payout_method?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          is_admin?: boolean
          payout_handle?: string | null
          payout_method?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_cents: number
          contest_id: string | null
          created_at: string
          currency: string
          id: string
          meta: Json | null
          session_id: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          contest_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          meta?: Json | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          contest_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          meta?: Json | null
          session_id?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_cents: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_cents?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_cents?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_contest_leaderboard: {
        Args: { _contest_id: string; _limit?: number }
        Returns: {
          avatar_url: string
          best_score: number
          display_name: string
          rank: number
          user_id: string
          username: string
        }[]
      }
      get_display_names: {
        Args: { user_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      get_global_leaderboard: {
        Args: {
          _contest_id?: string
          _game_id?: string
          _limit?: number
          _offset?: number
          _search?: string
        }
        Returns: {
          avatar_url: string
          best_score: number
          contest_id: string
          contest_title: string
          display_name: string
          game_id: string
          game_title: string
          rank: number
          user_id: string
          username: string
        }[]
      }
      get_global_leaderboard_count: {
        Args: { _contest_id?: string; _game_id?: string; _search?: string }
        Returns: number
      }
      get_user_emails: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      cheat_status: "clean" | "suspected" | "confirmed"
      contest_status: "upcoming" | "active" | "closed"
      session_status: "active" | "ended" | "flagged"
      tx_status: "pending" | "succeeded" | "failed"
      tx_type: "topup" | "session_fee" | "payout" | "admin_adjust"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      cheat_status: ["clean", "suspected", "confirmed"],
      contest_status: ["upcoming", "active", "closed"],
      session_status: ["active", "ended", "flagged"],
      tx_status: ["pending", "succeeded", "failed"],
      tx_type: ["topup", "session_fee", "payout", "admin_adjust"],
    },
  },
} as const
