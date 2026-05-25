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
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          gym_id: string | null
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          gym_id?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          gym_id?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          target?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      gyms: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          qr_code: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          qr_code: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          qr_code?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          from_user: string
          id: string
          is_like: boolean
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          is_like: boolean
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          is_like?: boolean
          to_user?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          active: boolean
          created_at: string
          has_messages: boolean
          id: string
          last_message_at: string | null
          unread_a: number
          unread_b: number
          user_a: string
          user_b: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          has_messages?: boolean
          id?: string
          last_message_at?: string | null
          unread_a?: number
          unread_b?: number
          user_a: string
          user_b: string
        }
        Update: {
          active?: boolean
          created_at?: string
          has_messages?: boolean
          id?: string
          last_message_at?: string | null
          unread_a?: number
          unread_b?: number
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          deleted_for_user: boolean
          id: string
          is_system: boolean
          match_id: string
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          content: string
          created_at?: string
          deleted_for_user?: boolean
          id?: string
          is_system?: boolean
          match_id: string
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          content?: string
          created_at?: string
          deleted_for_user?: boolean
          id?: string
          is_system?: boolean
          match_id?: string
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_boosts: {
        Row: {
          activated_at: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          activated_at?: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_history: {
        Row: {
          changed_at: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          available_hours: Database["public"]["Enums"]["training_hour"][]
          bio: string | null
          cpf: string | null
          cpf_verified: boolean
          created_at: string
          email: string | null
          gender: Database["public"]["Enums"]["gender"] | null
          gender_preference: Database["public"]["Enums"]["gender"][]
          goal: Database["public"]["Enums"]["goal"] | null
          gym_id: string | null
          hide_hours: boolean
          hide_orientation: boolean
          id: string
          interests: string[]
          looking_for: Database["public"]["Enums"]["goal"][]
          modalities: string[]
          name: string | null
          phone: string | null
          photo_url: string | null
          plan: Database["public"]["Enums"]["plan_type"]
          profile_complete: boolean
          sexual_orientation: string | null
          status: Database["public"]["Enums"]["profile_status"]
          terms_accepted_at: string | null
          training_level: Database["public"]["Enums"]["training_level"] | null
          training_split: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          available_hours?: Database["public"]["Enums"]["training_hour"][]
          bio?: string | null
          cpf?: string | null
          cpf_verified?: boolean
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][]
          goal?: Database["public"]["Enums"]["goal"] | null
          gym_id?: string | null
          hide_hours?: boolean
          hide_orientation?: boolean
          id: string
          interests?: string[]
          looking_for?: Database["public"]["Enums"]["goal"][]
          modalities?: string[]
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          profile_complete?: boolean
          sexual_orientation?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          terms_accepted_at?: string | null
          training_level?: Database["public"]["Enums"]["training_level"] | null
          training_split?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          available_hours?: Database["public"]["Enums"]["training_hour"][]
          bio?: string | null
          cpf?: string | null
          cpf_verified?: boolean
          created_at?: string
          email?: string | null
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_preference?: Database["public"]["Enums"]["gender"][]
          goal?: Database["public"]["Enums"]["goal"] | null
          gym_id?: string | null
          hide_hours?: boolean
          hide_orientation?: boolean
          id?: string
          interests?: string[]
          looking_for?: Database["public"]["Enums"]["goal"][]
          modalities?: string[]
          name?: string | null
          phone?: string | null
          photo_url?: string | null
          plan?: Database["public"]["Enums"]["plan_type"]
          profile_complete?: boolean
          sexual_orientation?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          terms_accepted_at?: string | null
          training_level?: Database["public"]["Enums"]["training_level"] | null
          training_split?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          urgent: boolean
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_id: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          urgent?: boolean
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_id?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          urgent?: boolean
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          benefits_json: Json
          created_at: string
          id: string
          name: Database["public"]["Enums"]["plan_type"]
          price: number
        }
        Insert: {
          benefits_json?: Json
          created_at?: string
          id?: string
          name: Database["public"]["Enums"]["plan_type"]
          price?: number
        }
        Update: {
          benefits_json?: Json
          created_at?: string
          id?: string
          name?: Database["public"]["Enums"]["plan_type"]
          price?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_gyms: {
        Row: {
          added_at: string
          gym_id: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          gym_id: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          gym_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gyms_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_gyms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_subscriptions: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          payment_reference: string | null
          plan_id: string
          starts_at: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          payment_reference?: string | null
          plan_id: string
          starts_at?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          payment_reference?: string | null
          plan_id?: string
          starts_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_deck: {
        Args: {
          current_user_id: string
          page_limit?: number
          page_offset?: number
        }
        Returns: {
          age: number
          available_hours: string[]
          bio: string
          gender: string
          goal: string
          name: string
          photo_url: string
          preferred_modalities: string[]
          training_level: string
          user_id: string
        }[]
      }
      handle_swipe: {
        Args: { from_user: string; swipe_action: string; to_user: string }
        Returns: Json
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_match_read: { Args: { p_match: string }; Returns: undefined }
      my_gym_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "student"
      gender: "male" | "female" | "non_binary" | "other"
      goal: "friends" | "training_partner" | "romance"
      message_type: "text" | "audio" | "image"
      plan_type: "free" | "gold" | "diamond"
      profile_status: "active" | "paused" | "deleted" | "suspended"
      report_reason:
        | "harassment"
        | "fake_profile"
        | "offensive_language"
        | "spam"
        | "inappropriate_behavior"
        | "racism"
      report_status: "pending" | "reviewed" | "action_taken" | "dismissed"
      training_hour: "morning" | "afternoon" | "night"
      training_level: "beginner" | "intermediate" | "advanced"
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
      app_role: ["admin", "student"],
      gender: ["male", "female", "non_binary", "other"],
      goal: ["friends", "training_partner", "romance"],
      message_type: ["text", "audio", "image"],
      plan_type: ["free", "gold", "diamond"],
      profile_status: ["active", "paused", "deleted", "suspended"],
      report_reason: [
        "harassment",
        "fake_profile",
        "offensive_language",
        "spam",
        "inappropriate_behavior",
        "racism",
      ],
      report_status: ["pending", "reviewed", "action_taken", "dismissed"],
      training_hour: ["morning", "afternoon", "night"],
      training_level: ["beginner", "intermediate", "advanced"],
    },
  },
} as const
