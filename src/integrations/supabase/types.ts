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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          school_id: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          school_id: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          school_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_published: boolean | null
          is_urgent: boolean | null
          priority: string | null
          published_at: string | null
          school_id: string
          target_audience: string[] | null
          target_classes: string[] | null
          target_role: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          is_urgent?: boolean | null
          priority?: string | null
          published_at?: string | null
          school_id: string
          target_audience?: string[] | null
          target_classes?: string[] | null
          target_role?: Database["public"]["Enums"]["user_role"][] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_published?: boolean | null
          is_urgent?: boolean | null
          priority?: string | null
          published_at?: string | null
          school_id?: string
          target_audience?: string[] | null
          target_classes?: string[] | null
          target_role?: Database["public"]["Enums"]["user_role"][] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendances: {
        Row: {
          class_id: string
          created_at: string | null
          date: string
          id: string
          is_justified: boolean | null
          justification_document: string | null
          period: string | null
          reason: string | null
          recorded_by: string | null
          school_id: string
          student_id: string
          subject_id: string | null
          teacher_id: string | null
          type: Database["public"]["Enums"]["absence_type"]
        }
        Insert: {
          class_id: string
          created_at?: string | null
          date?: string
          id?: string
          is_justified?: boolean | null
          justification_document?: string | null
          period?: string | null
          reason?: string | null
          recorded_by?: string | null
          school_id: string
          student_id: string
          subject_id?: string | null
          teacher_id?: string | null
          type: Database["public"]["Enums"]["absence_type"]
        }
        Update: {
          class_id?: string
          created_at?: string | null
          date?: string
          id?: string
          is_justified?: boolean | null
          justification_document?: string | null
          period?: string | null
          reason?: string | null
          recorded_by?: string | null
          school_id?: string
          student_id?: string
          subject_id?: string | null
          teacher_id?: string | null
          type?: Database["public"]["Enums"]["absence_type"]
        }
        Relationships: [
          {
            foreignKeyName: "attendances_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendances_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          category: Database["public"]["Enums"]["log_category"]
          context: Json | null
          created_at: string | null
          details: Json | null
          error_stack: string | null
          id: string
          ip_address: unknown | null
          level: Database["public"]["Enums"]["log_level"]
          message: string
          school_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["log_category"]
          context?: Json | null
          created_at?: string | null
          details?: Json | null
          error_stack?: string | null
          id?: string
          ip_address?: unknown | null
          level: Database["public"]["Enums"]["log_level"]
          message: string
          school_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["log_category"]
          context?: Json | null
          created_at?: string | null
          details?: Json | null
          error_stack?: string | null
          id?: string
          ip_address?: unknown | null
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          school_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_labels: {
        Row: {
          created_at: string
          id: string
          label: string
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          school_id?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          academic_year_id: string
          capacity: number | null
          created_at: string | null
          effectif: number | null
          id: string
          level: string
          name: string
          school_id: string
          section: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year_id: string
          capacity?: number | null
          created_at?: string | null
          effectif?: number | null
          id?: string
          level: string
          name: string
          school_id: string
          section?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year_id?: string
          capacity?: number | null
          created_at?: string | null
          effectif?: number | null
          id?: string
          level?: string
          name?: string
          school_id?: string
          section?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      default_labels: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      default_series: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      exams: {
        Row: {
          class_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          exam_date: string
          id: string
          is_published: boolean
          school_id: string
          semester: string | null
          start_time: string | null
          subject_id: string | null
          teacher_id: string | null
          title: string
          total_points: number | null
          updated_at: string | null
        }
        Insert: {
          class_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          exam_date: string
          id?: string
          is_published?: boolean
          school_id: string
          semester?: string | null
          start_time?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title: string
          total_points?: number | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          exam_date?: string
          id?: string
          is_published?: boolean
          school_id?: string
          semester?: string | null
          start_time?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          title?: string
          total_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          coefficient: number
          created_at: string | null
          created_by: string | null
          exam_id: string | null
          exam_type: string
          grade_value: number
          id: string
          max_grade: number
          school_id: string
          semester: string | null
          student_id: string
          subject_id: string
          updated_at: string | null
        }
        Insert: {
          coefficient?: number
          created_at?: string | null
          created_by?: string | null
          exam_id?: string | null
          exam_type: string
          grade_value: number
          id?: string
          max_grade: number
          school_id: string
          semester?: string | null
          student_id: string
          subject_id: string
          updated_at?: string | null
        }
        Update: {
          coefficient?: number
          created_at?: string | null
          created_by?: string | null
          exam_id?: string | null
          exam_type?: string
          grade_value?: number
          id?: string
          max_grade?: number
          school_id?: string
          semester?: string | null
          student_id?: string
          subject_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_grades_exam_id"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_grades_school_id"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_grades_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_grades_subject_id"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_logs: {
        Row: {
          class_id: string
          content: string
          created_at: string | null
          end_time: string | null
          homework: string | null
          id: string
          lesson_date: string
          resources: string | null
          school_id: string
          start_time: string | null
          subject_id: string
          teacher_id: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          class_id: string
          content: string
          created_at?: string | null
          end_time?: string | null
          homework?: string | null
          id?: string
          lesson_date?: string
          resources?: string | null
          school_id: string
          start_time?: string | null
          subject_id: string
          teacher_id: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string | null
          end_time?: string | null
          homework?: string | null
          id?: string
          lesson_date?: string
          resources?: string | null
          school_id?: string
          start_time?: string | null
          subject_id?: string
          teacher_id?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_logs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_logs_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      matricule_generation_log: {
        Row: {
          generated_email: string | null
          generated_matricule: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          source: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          generated_email?: string | null
          generated_matricule: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          source?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          generated_email?: string | null
          generated_matricule?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          source?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matricule_generation_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          icon: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          school_id: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          school_id: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          school_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_categories: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean | null
          name: string
          school_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          name: string
          school_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_config: {
        Row: {
          created_at: string | null
          encrypted_api_key: string
          encrypted_secret_key: string
          environment: string
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          encrypted_api_key: string
          encrypted_secret_key: string
          environment?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          encrypted_api_key?: string
          encrypted_secret_key?: string
          environment?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          gateway_response: Json | null
          id: string
          paytech_transaction_id: string | null
          school_id: string
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          gateway_response?: Json | null
          id?: string
          paytech_transaction_id?: string | null
          school_id: string
          status: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          gateway_response?: Json | null
          id?: string
          paytech_transaction_id?: string | null
          school_id?: string
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          paid_by: string
          payment_date: string
          payment_method: string
          payment_month: string | null
          payment_type: string
          phone_number: string | null
          school_id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          paid_by: string
          payment_date?: string
          payment_method: string
          payment_month?: string | null
          payment_type: string
          phone_number?: string | null
          school_id: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          paid_by?: string
          payment_date?: string
          payment_method?: string
          payment_month?: string | null
          payment_type?: string
          phone_number?: string | null
          school_id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_school_id"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_payments_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          first_name: string
          id: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          activity_name: string | null
          class_id: string
          created_at: string | null
          day: string
          day_of_week: number
          description: string | null
          end_time: string
          id: string
          room: string | null
          school_id: string
          start_time: string
          subject: string
          subject_id: string | null
          teacher: string | null
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          activity_name?: string | null
          class_id: string
          created_at?: string | null
          day?: string
          day_of_week: number
          description?: string | null
          end_time: string
          id?: string
          room?: string | null
          school_id: string
          start_time: string
          subject?: string
          subject_id?: string | null
          teacher?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          activity_name?: string | null
          class_id?: string
          created_at?: string | null
          day?: string
          day_of_week?: number
          description?: string | null
          end_time?: string
          id?: string
          room?: string | null
          school_id?: string
          start_time?: string
          subject?: string
          subject_id?: string | null
          teacher?: string | null
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      school_user_counters: {
        Row: {
          created_at: string | null
          current_count: number
          id: string
          school_id: string
          updated_at: string | null
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          current_count?: number
          id?: string
          school_id: string
          updated_at?: string | null
          user_role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          current_count?: number
          id?: string
          school_id?: string
          updated_at?: string | null
          user_role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "school_user_counters_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          academic_year: string
          address: string | null
          auto_generate_parent_matricule: boolean | null
          auto_generate_student_matricule: boolean | null
          auto_generate_teacher_matricule: boolean | null
          created_at: string | null
          created_by: string | null
          creation_year: number | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          default_parent_password: string | null
          default_student_password: string | null
          default_teacher_password: string | null
          email: string | null
          id: string
          language: Database["public"]["Enums"]["language_type"] | null
          logo_url: string | null
          name: string
          parent_matricule_format: string | null
          phone: string | null
          school_suffix: string | null
          school_type: Database["public"]["Enums"]["school_type"] | null
          semester_type:
            | Database["public"]["Enums"]["semester_system_type"]
            | null
          slogan: string | null
          sponsor_email: string | null
          sponsor_name: string | null
          sponsor_phone: string | null
          starter_compatible: boolean
          student_matricule_format: string | null
          subscription_plan: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          teacher_matricule_format: string | null
          timezone: string | null
          trial_end_date: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year?: string
          address?: string | null
          auto_generate_parent_matricule?: boolean | null
          auto_generate_student_matricule?: boolean | null
          auto_generate_teacher_matricule?: boolean | null
          created_at?: string | null
          created_by?: string | null
          creation_year?: number | null
          currency?: Database["public"]["Enums"]["currency_type"] | null
          default_parent_password?: string | null
          default_student_password?: string | null
          default_teacher_password?: string | null
          email?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_type"] | null
          logo_url?: string | null
          name: string
          parent_matricule_format?: string | null
          phone?: string | null
          school_suffix?: string | null
          school_type?: Database["public"]["Enums"]["school_type"] | null
          semester_type?:
            | Database["public"]["Enums"]["semester_system_type"]
            | null
          slogan?: string | null
          sponsor_email?: string | null
          sponsor_name?: string | null
          sponsor_phone?: string | null
          starter_compatible?: boolean
          student_matricule_format?: string | null
          subscription_plan?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          teacher_matricule_format?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          address?: string | null
          auto_generate_parent_matricule?: boolean | null
          auto_generate_student_matricule?: boolean | null
          auto_generate_teacher_matricule?: boolean | null
          created_at?: string | null
          created_by?: string | null
          creation_year?: number | null
          currency?: Database["public"]["Enums"]["currency_type"] | null
          default_parent_password?: string | null
          default_student_password?: string | null
          default_teacher_password?: string | null
          email?: string | null
          id?: string
          language?: Database["public"]["Enums"]["language_type"] | null
          logo_url?: string | null
          name?: string
          parent_matricule_format?: string | null
          phone?: string | null
          school_suffix?: string | null
          school_type?: Database["public"]["Enums"]["school_type"] | null
          semester_type?:
            | Database["public"]["Enums"]["semester_system_type"]
            | null
          slogan?: string | null
          sponsor_email?: string | null
          sponsor_name?: string | null
          sponsor_phone?: string | null
          starter_compatible?: boolean
          student_matricule_format?: string | null
          subscription_plan?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          teacher_matricule_format?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      series: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: []
      }
      student_documents: {
        Row: {
          created_at: string | null
          document_name: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          mime_type: string
          school_id: string
          student_id: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          document_name: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          mime_type: string
          school_id: string
          student_id: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          document_name?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          mime_type?: string
          school_id?: string
          student_id?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_grades: {
        Row: {
          class_id: string
          created_at: string
          grade_type: string
          id: string
          max_score: number | null
          school_id: string
          score: number | null
          semester: number
          student_id: string
          subject_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          grade_type: string
          id?: string
          max_score?: number | null
          school_id: string
          score?: number | null
          semester: number
          student_id: string
          subject_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          grade_type?: string
          id?: string
          max_score?: number | null
          school_id?: string
          score?: number | null
          semester?: number
          student_id?: string
          subject_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string | null
          class_id: string | null
          created_at: string | null
          date_of_birth: string | null
          emergency_contact: string | null
          enrollment_date: string | null
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          is_active: boolean | null
          last_name: string
          parent_email: string | null
          parent_first_name: string | null
          parent_last_name: string | null
          parent_matricule: string | null
          parent_phone: string | null
          phone: string | null
          place_of_birth: string | null
          school_id: string
          student_number: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          enrollment_date?: string | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean | null
          last_name: string
          parent_email?: string | null
          parent_first_name?: string | null
          parent_last_name?: string | null
          parent_matricule?: string | null
          parent_phone?: string | null
          phone?: string | null
          place_of_birth?: string | null
          school_id: string
          student_number: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          class_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact?: string | null
          enrollment_date?: string | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          parent_email?: string | null
          parent_first_name?: string | null
          parent_last_name?: string | null
          parent_matricule?: string | null
          parent_phone?: string | null
          phone?: string | null
          place_of_birth?: string | null
          school_id?: string
          student_number?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          abbreviation: string | null
          class_id: string
          code: string | null
          coefficient: number | null
          color: string | null
          created_at: string | null
          hours_per_week: number | null
          id: string
          max_score: number | null
          name: string
          school_id: string
        }
        Insert: {
          abbreviation?: string | null
          class_id: string
          code?: string | null
          coefficient?: number | null
          color?: string | null
          created_at?: string | null
          hours_per_week?: number | null
          id?: string
          max_score?: number | null
          name: string
          school_id: string
        }
        Update: {
          abbreviation?: string | null
          class_id?: string
          code?: string | null
          coefficient?: number | null
          color?: string | null
          created_at?: string | null
          hours_per_week?: number | null
          id?: string
          max_score?: number | null
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string | null
          currency: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_classes: number | null
          max_students: number | null
          name: string
          period: string
          price: number
        }
        Insert: {
          code: string
          created_at?: string | null
          currency?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_classes?: number | null
          max_students?: number | null
          name: string
          period: string
          price: number
        }
        Update: {
          code?: string
          created_at?: string | null
          currency?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_classes?: number | null
          max_students?: number | null
          name?: string
          period?: string
          price?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          end_date: string | null
          id: string
          paytech_transaction_id: string | null
          plan_id: string
          school_id: string
          start_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          paytech_transaction_id?: string | null
          plan_id: string
          school_id: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          id?: string
          paytech_transaction_id?: string | null
          plan_id?: string
          school_id?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subjects: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          school_id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          school_id: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          school_id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string | null
          created_at: string | null
          employee_number: string
          first_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          school_id: string
          specialization: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          employee_number: string
          first_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          school_id: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          employee_number?: string
          first_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          school_id?: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      index_size_report: {
        Row: {
          index_name: unknown | null
          scans: number | null
          schemaname: unknown | null
          size: string | null
          table_name: unknown | null
        }
        Relationships: []
      }
      slow_queries_monitoring: {
        Row: {
          avg_ms: number | null
          calls: number | null
          query_preview: string | null
          total_ms: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      associate_orphan_grades_to_exams: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      calculate_student_average: {
        Args: { class_id: string; semester: number; student_id: string }
        Returns: number
      }
      check_subscription_expiration: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_school_suffix: {
        Args: { school_name: string }
        Returns: string
      }
      generate_user_identifier: {
        Args: {
          role_param: Database["public"]["Enums"]["user_role"]
          school_id_param: string
          school_suffix_param?: string
        }
        Returns: string
      }
      generate_user_matricule_v2: {
        Args: {
          role_param: Database["public"]["Enums"]["user_role"]
          school_id_param: string
        }
        Returns: {
          format_used: string
          full_email: string
          matricule: string
        }[]
      }
      get_next_user_identifier_number: {
        Args: {
          role_param: Database["public"]["Enums"]["user_role"]
          school_id_param: string
        }
        Returns: number
      }
      get_next_user_number_continuous: {
        Args: {
          role_param: Database["public"]["Enums"]["user_role"]
          school_id_param: string
        }
        Returns: number
      }
      get_next_user_number_from_all_sources: {
        Args: {
          prefix_pattern: string
          role_param: Database["public"]["Enums"]["user_role"]
          school_id_param: string
        }
        Returns: number
      }
      get_school_profiles: {
        Args: { target_school_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          school_id: string
          updated_at: string
        }[]
      }
      get_user_school_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      initialize_new_school: {
        Args: {
          academic_year_name_param?: string
          school_id_param: string
          school_type_param?: Database["public"]["Enums"]["school_type"]
        }
        Returns: undefined
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      validate_school_isolation: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      absence_type: "absence" | "retard"
      currency_type: "FCFA" | "EUR" | "USD" | "MAD" | "GNF"
      gender: "M" | "F"
      language_type: "french" | "arabic"
      log_category: "auth" | "database" | "api" | "ui" | "business" | "security"
      log_level: "debug" | "info" | "warn" | "error" | "critical"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      school_type: "public" | "private" | "semi_private" | "international"
      semester_system_type: "semester" | "trimester"
      subscription_status: "trial" | "active" | "suspended" | "cancelled"
      user_role:
        | "super_admin"
        | "school_admin"
        | "teacher"
        | "student"
        | "parent"
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
      absence_type: ["absence", "retard"],
      currency_type: ["FCFA", "EUR", "USD", "MAD", "GNF"],
      gender: ["M", "F"],
      language_type: ["french", "arabic"],
      log_category: ["auth", "database", "api", "ui", "business", "security"],
      log_level: ["debug", "info", "warn", "error", "critical"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      school_type: ["public", "private", "semi_private", "international"],
      semester_system_type: ["semester", "trimester"],
      subscription_status: ["trial", "active", "suspended", "cancelled"],
      user_role: [
        "super_admin",
        "school_admin",
        "teacher",
        "student",
        "parent",
      ],
    },
  },
} as const
