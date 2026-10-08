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
      challenge_comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          author_name?: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "challenge_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          author_name: string
          challenge_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          author_name?: string
          challenge_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          challenge_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_posts: {
        Row: {
          activity_at: string
          author_name: string
          challenge_id: string
          created_at: string
          description: string | null
          id: string
          photo_url: string | null
          source: string
          title: string
          updated_at: string
          user_id: string
          workout_execution_id: string | null
        }
        Insert: {
          activity_at?: string
          author_name?: string
          challenge_id: string
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          source?: string
          title: string
          updated_at?: string
          user_id: string
          workout_execution_id?: string | null
        }
        Update: {
          activity_at?: string
          author_name?: string
          challenge_id?: string
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
          workout_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_posts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_posts_workout_execution_id_fkey"
            columns: ["workout_execution_id"]
            isOneToOne: false
            referencedRelation: "workout_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_reactions: {
        Row: {
          created_at: string
          emoji: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "challenge_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          creator_id: string
          description: string | null
          end_date: string | null
          id: string
          invite_active: boolean
          invite_code: string
          rules: string | null
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description?: string | null
          end_date?: string | null
          id?: string
          invite_active?: boolean
          invite_code?: string
          rules?: string | null
          start_date?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string | null
          end_date?: string | null
          id?: string
          invite_active?: boolean
          invite_code?: string
          rules?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          cycle_weeks: number | null
          deadline: string | null
          description: string | null
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
          cycle_weeks?: number | null
          deadline?: string | null
          description?: string | null
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
          cycle_weeks?: number | null
          deadline?: string | null
          description?: string | null
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
      reschedule_requests: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          occurrence_date: string
          proposed_date: string
          proposed_end_time: string
          proposed_start_time: string
          requested_by: string
          responded_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          student_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          occurrence_date: string
          proposed_date: string
          proposed_end_time: string
          proposed_start_time: string
          requested_by: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          student_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          occurrence_date?: string
          proposed_date?: string
          proposed_end_time?: string
          proposed_start_time?: string
          requested_by?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          student_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "schedule_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reschedule_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reschedule_requests_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      student_invites: {
        Row: {
          created_at: string | null
          email: string
          email_sent_at: string | null
          id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["request_status"]
          student_id: string | null
          trainer_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          email_sent_at?: string | null
          id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          student_id?: string | null
          trainer_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          email_sent_at?: string | null
          id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          student_id?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_invites_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_invites_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      student_restrictions: {
        Row: {
          created_at: string | null
          description: string
          id: string
          student_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          student_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          student_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_restrictions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_restrictions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainer_profiles"
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
          plan_id: string | null
          student_id: string
          workout_id: string | null
          workout_name: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          observations?: string | null
          plan_id?: string | null
          student_id: string
          workout_id?: string | null
          workout_name?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          observations?: string | null
          plan_id?: string | null
          student_id?: string
          workout_id?: string | null
          workout_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
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
          week_index: number | null
          weekday: number | null
          workout_date: string | null
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
          week_index?: number | null
          weekday?: number | null
          workout_date?: string | null
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
          week_index?: number | null
          weekday?: number | null
          workout_date?: string | null
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
      challenge_is_open: { Args: { _challenge_id: string }; Returns: boolean }
      confirm_booking: { Args: { p_booking_id: string }; Returns: string }
      current_student_id: { Args: never; Returns: string }
      current_trainer_id: { Args: never; Returns: string }
      get_challenge_preview: { Args: { p_code: string }; Returns: Json }
      get_challenge_ranking: {
        Args: { p_challenge_id: string }
        Returns: {
          author_name: string
          last_activity: string
          points: number
          user_id: string
        }[]
      }
      invite_student: { Args: { p_email: string }; Returns: Json }
      is_challenge_creator: {
        Args: { _challenge_id: string }
        Returns: boolean
      }
      is_challenge_member: { Args: { _challenge_id: string }; Returns: boolean }
      is_linked_trainer_of_student: {
        Args: { _student_id: string }
        Returns: boolean
      }
      is_plan_trainer: { Args: { _plan_id: string }; Returns: boolean }
      is_workout_trainer: { Args: { _workout_id: string }; Returns: boolean }
      join_challenge: { Args: { p_code: string }; Returns: string }
      owns_execution: { Args: { _execution_id: string }; Returns: boolean }
      post_challenge_id: { Args: { _post_id: string }; Returns: string }
      request_reschedule: {
        Args: {
          p_date: string
          p_end: string
          p_event_id: string
          p_occurrence_date: string
          p_start: string
        }
        Returns: number
      }
      respond_reschedule: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: undefined
      }
      respond_student_invite: {
        Args: { p_accept: boolean; p_invite_id: string }
        Returns: undefined
      }
      trainer_has_relation_with_profile: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      trainer_has_relation_with_student: {
        Args: { p_student_id: string }
        Returns: boolean
      }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "rejected" | "suggested"
      plan_status: "active" | "completed" | "cancelled"
      request_status: "pending" | "accepted" | "declined"
      schedule_event_type:
        | "aula"
        | "bloqueado"
        | "fora_expediente"
        | "expediente"
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
      plan_status: ["active", "completed", "cancelled"],
      request_status: ["pending", "accepted", "declined"],
      schedule_event_type: [
        "aula",
        "bloqueado",
        "fora_expediente",
        "expediente",
      ],
      schedule_recurrence: ["once", "weekly"],
      user_role: ["trainer", "student"],
    },
  },
} as const
