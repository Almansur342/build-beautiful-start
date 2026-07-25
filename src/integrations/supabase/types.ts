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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          bound_at: string | null
          created_at: string
          device_fingerprint: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          bound_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          bound_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          bucket: string
          hits: number
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          updated_at?: string
          window_start: string
        }
        Update: {
          bucket?: string
          hits?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      extension_sessions: {
        Row: {
          api_key_id: string
          created_at: string
          device_fingerprint: string
          id: string
          last_used_at: string
          refresh_expires_at: string
          refresh_token_hash: string
          revoked_at: string | null
          session_expires_at: string
          session_token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          api_key_id: string
          created_at?: string
          device_fingerprint: string
          id?: string
          last_used_at?: string
          refresh_expires_at: string
          refresh_token_hash: string
          revoked_at?: string | null
          session_expires_at: string
          session_token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          api_key_id?: string
          created_at?: string
          device_fingerprint?: string
          id?: string
          last_used_at?: string
          refresh_expires_at?: string
          refresh_token_hash?: string
          revoked_at?: string | null
          session_expires_at?: string
          session_token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extension_sessions_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          category: string | null
          created_at: string
          id: string
          message: string | null
          rating: number
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          message?: string | null
          rating: number
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          message?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          daily_scan_limit: number | null
          id: string
          is_active: boolean
          name: string
          price_usd: number
          slug: string
          sort_order: number
          stripe_price_id: string | null
          validity_days: number | null
        }
        Insert: {
          created_at?: string
          daily_scan_limit?: number | null
          id?: string
          is_active?: boolean
          name: string
          price_usd?: number
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
          validity_days?: number | null
        }
        Update: {
          created_at?: string
          daily_scan_limit?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price_usd?: number
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
          validity_days?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          bio: string | null
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          timezone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          admin_note: string | null
          amount_usd: number | null
          created_at: string
          id: string
          reason: string
          status: string
          stripe_charge_id: string | null
          stripe_invoice_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_usd?: number | null
          created_at?: string
          id?: string
          reason: string
          status?: string
          stripe_charge_id?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_usd?: number | null
          created_at?: string
          id?: string
          reason?: string
          status?: string
          stripe_charge_id?: string | null
          stripe_invoice_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_events: {
        Row: {
          created_at: string
          event_id: string
          scan_id: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          scan_id?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          scan_id?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      scan_logs: {
        Row: {
          api_key_id: string | null
          id: string
          scanned_at: string
          user_id: string
          website_url: string
        }
        Insert: {
          api_key_id?: string | null
          id?: string
          scanned_at?: string
          user_id: string
          website_url: string
        }
        Update: {
          api_key_id?: string | null
          id?: string
          scanned_at?: string
          user_id?: string
          website_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender: string
          ticket_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender: string
          ticket_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender?: string
          ticket_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          priority: string
          status: string
          subject: string
          unread_for_admin: number
          unread_for_user: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject: string
          unread_for_admin?: number
          unread_for_user?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject?: string
          unread_for_admin?: number
          unread_for_user?: number
          updated_at?: string
          user_id?: string
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
      user_usage_daily: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          usage_date: string
          used_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          usage_date?: string
          used_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          usage_date?: string
          used_count?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_increment_rate_limit: {
        Args: { _bucket: string; _max_hits: number; _window_seconds: number }
        Returns: {
          allowed: boolean
          hits: number
          retry_after: number
        }[]
      }
      cleanup_api_rate_limits: { Args: never; Returns: undefined }
      consume_scan_quota: {
        Args: {
          _event_id?: string
          _limit: number
          _scan_id?: string
          _user_id: string
          _website_url?: string
        }
        Returns: {
          allowed: boolean
          duplicate: boolean
          remaining: number
          used: number
        }[]
      }
      get_today_scan_count: { Args: { _user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "user"
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
      app_role: ["super_admin", "user"],
    },
  },
} as const
