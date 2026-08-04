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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      meets: {
        Row: {
          created_at: string
          date: string
          id: string
          name: string
          programme_id: string
          standards: Json
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          name: string
          programme_id: string
          standards?: Json
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          name?: string
          programme_id?: string
          standards?: Json
        }
        Relationships: [
          {
            foreignKeyName: "meets_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          athlete_id: string
          id: string
          message: string
          programme_id: string
          read_at: string | null
          sent_at: string
          type: string
        }
        Insert: {
          athlete_id: string
          id?: string
          message: string
          programme_id: string
          read_at?: string | null
          sent_at?: string
          type: string
        }
        Update: {
          athlete_id?: string
          id?: string
          message?: string
          programme_id?: string
          read_at?: string | null
          sent_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          baseline_distance: number | null
          created_at: string
          event: string | null
          event_group: string | null
          expo_push_token: string | null
          full_name: string
          group_name: string | null
          id: string
          programme_id: string | null
          qualifying_event: string | null
          qualifying_standard: number | null
          revenuecat_customer_id: string | null
          role: string
          subscription_exempt: boolean
          trial_started_at: string | null
        }
        Insert: {
          baseline_distance?: number | null
          created_at?: string
          event?: string | null
          event_group?: string | null
          expo_push_token?: string | null
          full_name: string
          group_name?: string | null
          id: string
          programme_id?: string | null
          qualifying_event?: string | null
          qualifying_standard?: number | null
          revenuecat_customer_id?: string | null
          role: string
          subscription_exempt?: boolean
          trial_started_at?: string | null
        }
        Update: {
          baseline_distance?: number | null
          created_at?: string
          event?: string | null
          event_group?: string | null
          expo_push_token?: string | null
          full_name?: string
          group_name?: string | null
          id?: string
          programme_id?: string | null
          qualifying_event?: string | null
          qualifying_standard?: number | null
          revenuecat_customer_id?: string | null
          role?: string
          subscription_exempt?: boolean
          trial_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_config: {
        Row: {
          competition_date: string | null
          id: string
          jumps_config: Json | null
          programme_id: string
          qualifying_standards: Json
          sprints_config: Json | null
          throws_config: Json | null
          updated_at: string
        }
        Insert: {
          competition_date?: string | null
          id?: string
          jumps_config?: Json | null
          programme_id: string
          qualifying_standards?: Json
          sprints_config?: Json | null
          throws_config?: Json | null
          updated_at?: string
        }
        Update: {
          competition_date?: string | null
          id?: string
          jumps_config?: Json | null
          programme_id?: string
          qualifying_standards?: Json
          sprints_config?: Json | null
          throws_config?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_config_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: true
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      programmes: {
        Row: {
          created_at: string
          event_groups: string[]
          id: string
          join_code: string
          name: string
        }
        Insert: {
          created_at?: string
          event_groups?: string[]
          id?: string
          join_code?: string
          name: string
        }
        Update: {
          created_at?: string
          event_groups?: string[]
          id?: string
          join_code?: string
          name?: string
        }
        Relationships: []
      }
      strength_logs: {
        Row: {
          athlete_id: string
          bench_1rm: number | null
          clean_1rm: number | null
          created_at: string
          deadlift_1rm: number | null
          id: string
          logged_at: string
          programme_id: string
          squat_1rm: number | null
        }
        Insert: {
          athlete_id: string
          bench_1rm?: number | null
          clean_1rm?: number | null
          created_at?: string
          deadlift_1rm?: number | null
          id?: string
          logged_at: string
          programme_id: string
          squat_1rm?: number | null
        }
        Update: {
          athlete_id?: string
          bench_1rm?: number | null
          clean_1rm?: number | null
          created_at?: string
          deadlift_1rm?: number | null
          id?: string
          logged_at?: string
          programme_id?: string
          squat_1rm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strength_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strength_logs_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          coach_id: string
          current_period_ends_at: string | null
          id: string
          programme_id: string
          revenuecat_entitlement: string | null
          status: string
          tier: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          current_period_ends_at?: string | null
          id?: string
          programme_id: string
          revenuecat_entitlement?: string | null
          status: string
          tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          current_period_ends_at?: string | null
          id?: string
          programme_id?: string
          revenuecat_entitlement?: string | null
          status?: string
          tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_logs: {
        Row: {
          athlete_id: string
          best_performance: number | null
          best_throw: number | null
          created_at: string
          energy_score: number | null
          id: string
          notes: string | null
          performance_unit: string | null
          programme_id: string
          rpe: number | null
          sleep_score: number | null
          soreness_score: number | null
          week_number: number
          week_start: string
        }
        Insert: {
          athlete_id: string
          best_performance?: number | null
          best_throw?: number | null
          created_at?: string
          energy_score?: number | null
          id?: string
          notes?: string | null
          performance_unit?: string | null
          programme_id: string
          rpe?: number | null
          sleep_score?: number | null
          soreness_score?: number | null
          week_number: number
          week_start: string
        }
        Update: {
          athlete_id?: string
          best_performance?: number | null
          best_throw?: number | null
          created_at?: string
          energy_score?: number | null
          id?: string
          notes?: string | null
          performance_unit?: string | null
          programme_id?: string
          rpe?: number | null
          sleep_score?: number | null
          soreness_score?: number | null
          week_number?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_logs_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          exercises: Json
          id: string
          intensity_pct: number | null
          programme_id: string
          rounding_increment: number
          week_number: number
        }
        Insert: {
          created_at?: string
          exercises?: Json
          id?: string
          intensity_pct?: number | null
          programme_id: string
          rounding_increment?: number
          week_number: number
        }
        Update: {
          created_at?: string
          exercises?: Json
          id?: string
          intensity_pct?: number | null
          programme_id?: string
          rounding_increment?: number
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "workouts_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "programmes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_programme_id: { Args: never; Returns: string }
      auth_role: { Args: never; Returns: string }
      programme_athlete_count: {
        Args: { target_programme_id: string }
        Returns: number
      }
      programme_athlete_limit: {
        Args: { target_programme_id: string }
        Returns: number
      }
      programme_id_for_join_code: { Args: { code: string }; Returns: string }
      setup_notification_wiring: {
        Args: { project_url: string; service_role_key: string }
        Returns: undefined
      }
      start_trial_if_needed: {
        Args: { target_programme_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
