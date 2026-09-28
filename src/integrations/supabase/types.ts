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
      body_weight_entries: {
        Row: {
          created_at: string | null
          date: string
          id: string
          student_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          student_id: string
          weight: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          student_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "body_weight_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      body_weight_goals: {
        Row: {
          goal: number
          student_id: string
        }
        Insert: {
          goal: number
          student_id: string
        }
        Update: {
          goal?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "body_weight_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string | null
          date: string
          end_time: string
          id: string
          location: string | null
          price: number | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          student_id: string
          suggested_date: string | null
          suggested_end_time: string | null
          suggested_start_time: string | null
          trainer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time: string
          id?: string
          location?: string | null
          price?: number | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          student_id: string
          suggested_date?: string | null
          suggested_end_time?: string | null
          suggested_start_time?: string | null
          trainer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string
          id?: string
          location?: string | null
          price?: number | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          student_id?: string
          suggested_date?: string | null
          suggested_end_time?: string | null
          suggested_start_time?: string | null
          trainer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_logs: {
        Row: {
          execution_id: string
          id: string
          is_pr: boolean | null
          notes: string | null
          performed_name: string
          planned_name: string
          workout_exercise_id: string | null
        }
        Insert: {
          execution_id: string
          id?: string
          is_pr?: boolean | null
          notes?: string | null
          performed_name: string
          planned_name: string
          workout_exercise_id?: string | null
        }
        Update: {
          execution_id?: string
          id?: string
          is_pr?: boolean | null
          notes?: string | null
          performed_name?: string
          planned_name?: string
          workout_exercise_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workout_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          student_id: string
          trainer_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          student_id: string
          trainer_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          student_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_versions: {
        Row: {
          created_at: string | null
          id: string
          plan_id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          plan_id: string
          snapshot: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          plan_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          deadline: string | null
          end_date: string | null
          id: string
          objective: string | null
          progress: number | null
          start_date: string
          status: Database["public"]["Enums"]["plan_status"] | null
          student_id: string
          title: string
          trainer_id: string
          training_approach: string | null
          training_strategy: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deadline?: string | null
          end_date?: string | null
          id?: string
          objective?: string | null
          progress?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"] | null
          student_id: string
          title: string
          trainer_id: string
          training_approach?: string | null
          training_strategy?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deadline?: string | null
          end_date?: string | null
          id?: string
          objective?: string | null
          progress?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"] | null
          student_id?: string
          title?: string
          trainer_id?: string
          training_approach?: string | null
          training_strategy?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          profile_image_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          phone?: string | null
          profile_image_url?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          profile_image_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string | null
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          student_id: string
          trainer_id: string
        }
        Insert: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          student_id: string
          trainer_id: string
        }
        Update: {
          booking_id?: string | null
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          student_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_event_students: {
        Row: {
          event_id: string
          id: string
          student_id: string
        }
        Insert: {
          event_id: string
          id?: string
          student_id: string
        }
        Update: {
          event_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_event_students_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_event_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_events: {
        Row: {
          booking_id: string | null
          created_at: string | null
          date: string | null
          end_date: string | null
          end_time: string
          excluded_dates: string[] | null
          id: string
          recurrence: Database["public"]["Enums"]["schedule_recurrence"]
          start_date: string
          start_time: string
          title: string | null
          trainer_id: string
          type: Database["public"]["Enums"]["schedule_event_type"]
          weekdays: number[] | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          date?: string | null
          end_date?: string | null
          end_time: string
          excluded_dates?: string[] | null
          id?: string
          recurrence: Database["public"]["Enums"]["schedule_recurrence"]
          start_date: string
          start_time: string
          title?: string | null
          trainer_id: string
          type: Database["public"]["Enums"]["schedule_event_type"]
          weekdays?: number[] | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          date?: string | null
          end_date?: string | null
          end_time?: string
          excluded_dates?: string[] | null
          id?: string
          recurrence?: Database["public"]["Enums"]["schedule_recurrence"]
          start_date?: string
          start_time?: string
          title?: string | null
          trainer_id?: string
          type?: Database["public"]["Enums"]["schedule_event_type"]
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_events_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          effort: number | null
          exercise_log_id: string
          id: string
          reps: string | null
          set_number: number
          weight: string | null
        }
        Insert: {
          effort?: number | null
          exercise_log_id: string
          id?: string
          reps?: string | null
          set_number: number
          weight?: string | null
        }
        Update: {
          effort?: number | null
          exercise_log_id?: string
          id?: string
          reps?: string | null
          set_number?: number
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_log_id_fkey"
            columns: ["exercise_log_id"]
            isOneToOne: false
            referencedRelation: "exercise_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          created_at: string | null
          description: string | null
          fitness_goals: string | null
          id: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          fitness_goals?: string | null
          id?: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          fitness_goals?: string | null
          id?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_clients: {
        Row: {
          created_at: string | null
          custom_price: number | null
          id: string
          status: string | null
          student_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string | null
          custom_price?: number | null
          id?: string
          status?: string | null
          student_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string | null
          custom_price?: number | null
          id?: string
          status?: string | null
          student_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_clients_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_clients_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_profiles: {
        Row: {
          base_price: number | null
          created_at: string | null
          cref: string | null
          description: string | null
          experience_years: number | null
          facebook: string | null
          id: string
          instagram: string | null
          is_active: boolean | null
          linkedin: string | null
          objectives: string | null
          profile_id: string
          rating: number | null
          start_date: string | null
          total_reviews: number | null
          total_students: number | null
          updated_at: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string | null
          cref?: string | null
          description?: string | null
          experience_years?: number | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          linkedin?: string | null
          objectives?: string | null
          profile_id: string
          rating?: number | null
          start_date?: string | null
          total_reviews?: number | null
          total_students?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string | null
          cref?: string | null
          description?: string | null
          experience_years?: number | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          linkedin?: string | null
          objectives?: string | null
          profile_id?: string
          rating?: number | null
          start_date?: string | null
          total_reviews?: number | null
          total_students?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_specialties: {
        Row: {
          created_at: string | null
          id: string
          specialty_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          specialty_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          specialty_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_specialties_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_specialties_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_executions: {
        Row: {
          created_at: string | null
          date: string
          id: string
          observations: string | null
          student_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          observations?: string | null
          student_id: string
          workout_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          observations?: string | null
          student_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_executions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_executions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          id: string
          load: string | null
          name: string
          order_index: number | null
          reps: string | null
          rest: string | null
          sets: number | null
          superset_group: string | null
          workout_id: string
        }
        Insert: {
          id?: string
          load?: string | null
          name: string
          order_index?: number | null
          reps?: string | null
          rest?: string | null
          sets?: number | null
          superset_group?: string | null
          workout_id: string
        }
        Update: {
          id?: string
          load?: string | null
          name?: string
          order_index?: number | null
          reps?: string | null
          rest?: string | null
          sets?: number | null
          superset_group?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string | null
          day: string | null
          id: string
          name: string
          observations: string | null
          order_index: number | null
          plan_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day?: string | null
          id?: string
          name: string
          observations?: string | null
          order_index?: number | null
          plan_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day?: string | null
          id?: string
          name?: string
          observations?: string | null
          order_index?: number | null
          plan_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_event: { Args: { _event_id: string }; Returns: boolean }
      can_access_execution: {
        Args: { _execution_id: string }
        Returns: boolean
      }
      can_access_plan: { Args: { _plan_id: string }; Returns: boolean }
      can_access_workout: { Args: { _workout_id: string }; Returns: boolean }
      can_view_profile: { Args: { _profile_id: string }; Returns: boolean }
      current_student_id: { Args: never; Returns: string }
      current_trainer_id: { Args: never; Returns: string }
      is_linked_trainer_of_student: {
        Args: { _student_id: string }
        Returns: boolean
      }
      is_plan_trainer: { Args: { _plan_id: string }; Returns: boolean }
      is_workout_trainer: { Args: { _workout_id: string }; Returns: boolean }
      owns_execution: { Args: { _execution_id: string }; Returns: boolean }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "rejected" | "suggested"
      plan_status: "active" | "completed"
      schedule_event_type: "aula" | "bloqueado" | "fora_expediente"
      schedule_recurrence: "once" | "weekly"
      user_role: "trainer" | "student"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      booking_status: ["pending", "confirmed", "rejected", "suggested"],
      plan_status: ["active", "completed"],
      schedule_event_type: ["aula", "bloqueado", "fora_expediente"],
      schedule_recurrence: ["once", "weekly"],
      user_role: ["trainer", "student"],
    },
  },
} as const
