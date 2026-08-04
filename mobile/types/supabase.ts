// Hand-authored to match supabase/migrations/20260101000000_init.sql.
// Once the project is linked, regenerate with the authoritative version:
//   npm run supabase:types
// (requires SUPABASE_PROJECT_REF in the environment and `supabase login`).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      programmes: {
        Row: {
          id: string;
          name: string;
          join_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          join_code?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['programmes']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          programme_id: string | null;
          role: 'coach' | 'athlete';
          full_name: string;
          event: string | null;
          expo_push_token: string | null;
          baseline_distance: number | null;
          qualifying_standard: number | null;
          qualifying_event: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          programme_id?: string | null;
          role: 'coach' | 'athlete';
          full_name: string;
          event?: string | null;
          expo_push_token?: string | null;
          baseline_distance?: number | null;
          qualifying_standard?: number | null;
          qualifying_event?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      weekly_logs: {
        Row: {
          id: string;
          athlete_id: string;
          programme_id: string;
          week_number: number;
          week_start: string;
          best_throw: number | null;
          rpe: number | null;
          sleep_score: number | null;
          soreness_score: number | null;
          energy_score: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          programme_id: string;
          week_number: number;
          week_start: string;
          best_throw?: number | null;
          rpe?: number | null;
          sleep_score?: number | null;
          soreness_score?: number | null;
          energy_score?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['weekly_logs']['Insert']>;
        Relationships: [];
      };
      strength_logs: {
        Row: {
          id: string;
          athlete_id: string;
          programme_id: string;
          logged_at: string;
          squat_1rm: number | null;
          bench_1rm: number | null;
          clean_1rm: number | null;
          deadlift_1rm: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          programme_id: string;
          logged_at: string;
          squat_1rm?: number | null;
          bench_1rm?: number | null;
          clean_1rm?: number | null;
          deadlift_1rm?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['strength_logs']['Insert']>;
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          programme_id: string;
          week_number: number;
          intensity_pct: number | null;
          exercises: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          programme_id: string;
          week_number: number;
          intensity_pct?: number | null;
          exercises?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['workouts']['Insert']>;
        Relationships: [];
      };
      notifications_log: {
        Row: {
          id: string;
          athlete_id: string;
          programme_id: string;
          type: 'pb' | 'missing_log' | 'high_rpe' | 'anomaly' | 'qualifying_risk';
          message: string;
          sent_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          programme_id: string;
          type: 'pb' | 'missing_log' | 'high_rpe' | 'anomaly' | 'qualifying_risk';
          message: string;
          sent_at?: string;
          read_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notifications_log']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      programme_id_for_join_code: {
        Args: { code: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
  };
}
