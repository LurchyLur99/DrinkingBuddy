export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          weight_kg: number | null;
          gender: 'male' | 'female' | 'other' | null;
          daily_limit: number;
          weekly_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          weight_kg?: number | null;
          gender?: 'male' | 'female' | 'other' | null;
          daily_limit?: number;
          weekly_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          weight_kg?: number | null;
          gender?: 'male' | 'female' | 'other' | null;
          daily_limit?: number;
          weekly_limit?: number;
          updated_at?: string;
        };
      };
      drink_logs: {
        Row: {
          id: string;
          user_id: string;
          drink_name: string;
          drink_type: string;
          volume_ml: number;
          abv_percent: number;
          standard_drinks: number;
          logged_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          drink_name: string;
          drink_type: string;
          volume_ml: number;
          abv_percent: number;
          standard_drinks: number;
          logged_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          drink_name?: string;
          drink_type?: string;
          volume_ml?: number;
          abv_percent?: number;
          standard_drinks?: number;
          logged_at?: string;
          notes?: string | null;
        };
      };
      drink_presets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          drink_type: string;
          volume_ml: number;
          abv_percent: number;
          standard_drinks: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          drink_type: string;
          volume_ml: number;
          abv_percent: number;
          standard_drinks: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          drink_type?: string;
          volume_ml?: number;
          abv_percent?: number;
          standard_drinks?: number;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DrinkLog = Database['public']['Tables']['drink_logs']['Row'];
export type DrinkPreset = Database['public']['Tables']['drink_presets']['Row'];
