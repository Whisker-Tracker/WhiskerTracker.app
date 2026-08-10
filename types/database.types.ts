export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TnrStatus =
  | "unaltered"
  | "trapped"
  | "neutered_spayed"
  | "eartipped";

export type UserRole = "admin" | "caretaker" | "volunteer";

export type CatGender = "male" | "female" | "unknown";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          role: UserRole;
          is_active: boolean;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          role?: UserRole;
          is_active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          role?: UserRole;
          is_active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      colonies: {
        Row: {
          id: string;
          name: string;
          location_name: string | null;
          latitude: number;
          longitude: number;
          description: string | null;
          photo_url: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location_name?: string | null;
          latitude: number;
          longitude: number;
          description?: string | null;
          photo_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location_name?: string | null;
          latitude?: number;
          longitude?: number;
          description?: string | null;
          photo_url?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "colonies_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cats: {
        Row: {
          id: string;
          colony_id: string | null;
          name: string;
          gender: CatGender | null;
          tnr_status: TnrStatus;
          microchip_id: string | null;
          photo_url: string | null;
          distinctive_marks: string | null;
          notes: string | null;
          estimated_birth_date: string | null;
          is_alive: boolean;
          is_adopted: boolean;
          deceased_at: string | null;
          adopted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          colony_id?: string | null;
          name: string;
          gender?: CatGender | null;
          tnr_status?: TnrStatus;
          microchip_id?: string | null;
          photo_url?: string | null;
          distinctive_marks?: string | null;
          notes?: string | null;
          estimated_birth_date?: string | null;
          is_alive?: boolean;
          is_adopted?: boolean;
          deceased_at?: string | null;
          adopted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          colony_id?: string | null;
          name?: string;
          gender?: CatGender | null;
          tnr_status?: TnrStatus;
          microchip_id?: string | null;
          photo_url?: string | null;
          distinctive_marks?: string | null;
          notes?: string | null;
          estimated_birth_date?: string | null;
          is_alive?: boolean;
          is_adopted?: boolean;
          deceased_at?: string | null;
          adopted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cats_colony_id_fkey";
            columns: ["colony_id"];
            isOneToOne: false;
            referencedRelation: "colonies";
            referencedColumns: ["id"];
          },
        ];
      };
      cat_diseases: {
        Row: {
          id: string;
          cat_id: string;
          disease_name: string;
          diagnosed_at: string;
          resolved_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cat_id: string;
          disease_name: string;
          diagnosed_at?: string;
          resolved_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cat_id?: string;
          disease_name?: string;
          diagnosed_at?: string;
          resolved_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cat_diseases_cat_id_fkey";
            columns: ["cat_id"];
            isOneToOne: false;
            referencedRelation: "cats";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cat_diseases_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      cat_disease_treatments: {
        Row: {
          id: string;
          cat_disease_id: string;
          treatment_name: string;
          started_at: string;
          ended_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cat_disease_id: string;
          treatment_name: string;
          started_at?: string;
          ended_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cat_disease_id?: string;
          treatment_name?: string;
          started_at?: string;
          ended_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cat_disease_treatments_cat_disease_id_fkey";
            columns: ["cat_disease_id"];
            isOneToOne: false;
            referencedRelation: "cat_diseases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cat_disease_treatments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feeding_logs: {
        Row: {
          id: string;
          colony_id: string | null;
          user_id: string | null;
          fed_at: string;
          cats_seen_count: number;
          hours_spent: number;
          food_type: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          colony_id?: string | null;
          user_id?: string | null;
          fed_at?: string;
          cats_seen_count?: number;
          hours_spent?: number;
          food_type?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          colony_id?: string | null;
          user_id?: string | null;
          fed_at?: string;
          cats_seen_count?: number;
          hours_spent?: number;
          food_type?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feeding_logs_colony_id_fkey";
            columns: ["colony_id"];
            isOneToOne: false;
            referencedRelation: "colonies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feeding_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
