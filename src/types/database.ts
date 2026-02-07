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
      assessment_assignments: {
        Row: {
          assessment_id: string
          assigned_at: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          kid_id: string
          organization_id: string | null
          score: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assessment_id: string
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          kid_id: string
          organization_id?: string | null
          score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assessment_id?: string
          assigned_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          kid_id?: string
          organization_id?: string | null
          score?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_assignments_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_results: {
        Row: {
          answers: Json
          assessment_id: string | null
          auto_score: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          graded_at: string | null
          id: string
          kid_id: string | null
          manual_score: number | null
          needs_manual_grading: boolean | null
          organization_id: string | null
          parent_comments: string | null
          parent_feedback: string | null
          status: string | null
          submitted_at: string
          time_spent_minutes: number | null
          updated_at: string | null
        }
        Insert: {
          answers: Json
          assessment_id?: string | null
          auto_score?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          graded_at?: string | null
          id?: string
          kid_id?: string | null
          manual_score?: number | null
          needs_manual_grading?: boolean | null
          organization_id?: string | null
          parent_comments?: string | null
          parent_feedback?: string | null
          status?: string | null
          submitted_at: string
          time_spent_minutes?: number | null
          updated_at?: string | null
        }
        Update: {
          answers?: Json
          assessment_id?: string | null
          auto_score?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          graded_at?: string | null
          id?: string
          kid_id?: string | null
          manual_score?: number | null
          needs_manual_grading?: boolean | null
          organization_id?: string | null
          parent_comments?: string | null
          parent_feedback?: string | null
          status?: string | null
          submitted_at?: string
          time_spent_minutes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_standards: {
        Row: {
          alignment_strength: string | null
          assessment_id: string
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string | null
          updated_at: string | null
          user_id: string | null
          user_standard_id: string
        }
        Insert: {
          alignment_strength?: string | null
          assessment_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_standard_id: string
        }
        Update: {
          alignment_strength?: string | null
          assessment_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_standard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_standards_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_standards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_standards_user_standard_id_fkey"
            columns: ["user_standard_id"]
            isOneToOne: false
            referencedRelation: "user_standards"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type: string
          completed: boolean | null
          completed_at: string | null
          content: Json | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          grade_level: string | null
          id: string
          kid_id: string | null
          lesson_id: string | null
          organization_id: string | null
          question_count: number | null
          score: number | null
          status: string | null
          student_id: string | null
          subject: string | null
          teacher_id: string | null
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assessment_type: string
          completed?: boolean | null
          completed_at?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          id?: string
          kid_id?: string | null
          lesson_id?: string | null
          organization_id?: string | null
          question_count?: number | null
          score?: number | null
          status?: string | null
          student_id?: string | null
          subject?: string | null
          teacher_id?: string | null
          title: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assessment_type?: string
          completed?: boolean | null
          completed_at?: string | null
          content?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          grade_level?: string | null
          id?: string
          kid_id?: string | null
          lesson_id?: string | null
          organization_id?: string | null
          question_count?: number | null
          score?: number | null
          status?: string | null
          student_id?: string | null
          subject?: string | null
          teacher_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_conflict_resolutions: {
        Row: {
          affected_lesson_id: string | null
          created_at: string | null
          id: string
          new_lesson_time: string | null
          organization_id: string
          resolution_notes: string | null
          resolution_type: string
          resolved_at: string | null
          resolved_by: string
          synced_work_event_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          affected_lesson_id?: string | null
          created_at?: string | null
          id?: string
          new_lesson_time?: string | null
          organization_id: string
          resolution_notes?: string | null
          resolution_type: string
          resolved_at?: string | null
          resolved_by: string
          synced_work_event_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          affected_lesson_id?: string | null
          created_at?: string | null
          id?: string
          new_lesson_time?: string | null
          organization_id?: string
          resolution_notes?: string | null
          resolution_type?: string
          resolved_at?: string | null
          resolved_by?: string
          synced_work_event_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_conflict_resolutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string
          auto_block_enabled: boolean | null
          calendar_email: string | null
          calendar_id: string | null
          calendar_name: string | null
          conflict_notification_enabled: boolean | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          organization_id: string
          provider: string
          provider_account_email: string | null
          provider_account_id: string | null
          push_lessons_to_calendar: boolean | null
          refresh_token: string | null
          sync_enabled: boolean | null
          token_expires_at: string
          updated_at: string | null
          user_id: string | null
          webhook_channel_id: string | null
          webhook_expires_at: string | null
          webhook_resource_id: string | null
        }
        Insert: {
          access_token: string
          auto_block_enabled?: boolean | null
          calendar_email?: string | null
          calendar_id?: string | null
          calendar_name?: string | null
          conflict_notification_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          organization_id?: string
          provider: string
          provider_account_email?: string | null
          provider_account_id?: string | null
          push_lessons_to_calendar?: boolean | null
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expires_at: string
          updated_at?: string | null
          user_id?: string | null
          webhook_channel_id?: string | null
          webhook_expires_at?: string | null
          webhook_resource_id?: string | null
        }
        Update: {
          access_token?: string
          auto_block_enabled?: boolean | null
          calendar_email?: string | null
          calendar_id?: string | null
          calendar_name?: string | null
          conflict_notification_enabled?: boolean | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          organization_id?: string
          provider?: string
          provider_account_email?: string | null
          provider_account_id?: string | null
          push_lessons_to_calendar?: boolean | null
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expires_at?: string
          updated_at?: string | null
          user_id?: string | null
          webhook_channel_id?: string | null
          webhook_expires_at?: string | null
          webhook_resource_id?: string | null
        }
        Relationships: []
      }
      calendar_sync_log: {
        Row: {
          calendar_connection_id: string
          conflicts_detected: number | null
          created_at: string | null
          error_details: Json | null
          error_message: string | null
          events_created: number | null
          events_deleted: number | null
          events_fetched: number | null
          events_updated: number | null
          id: string
          organization_id: string | null
          sync_completed_at: string | null
          sync_started_at: string
          sync_status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          calendar_connection_id: string
          conflicts_detected?: number | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_fetched?: number | null
          events_updated?: number | null
          id?: string
          organization_id?: string | null
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          calendar_connection_id?: string
          conflicts_detected?: number | null
          created_at?: string | null
          error_details?: Json | null
          error_message?: string | null
          events_created?: number | null
          events_deleted?: number | null
          events_fetched?: number | null
          events_updated?: number | null
          id?: string
          organization_id?: string | null
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_log_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          attendance_date: string
          class_id: string
          created_at: string
          enrollment_id: string
          id: string
          notes: string | null
          organization_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attendance_date: string
          class_id: string
          created_at?: string
          enrollment_id: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attendance_date?: string
          class_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "coop_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "class_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string
          created_at: string | null
          enrolled_at: string
          id: string
          kid_id: string | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          enrolled_at?: string
          id?: string
          kid_id?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          enrolled_at?: string
          id?: string
          kid_id?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "coop_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborator_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invite_token: string | null
          invited_at: string
          invited_by: string
          organization_id: string | null
          permissions: Json | null
          role: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invite_token?: string | null
          invited_at?: string
          invited_by: string
          organization_id?: string | null
          permissions?: Json | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invite_token?: string | null
          invited_at?: string
          invited_by?: string
          organization_id?: string | null
          permissions?: Json | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborator_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_profiles: {
        Row: {
          bio: string | null
          city: string
          created_at: string
          full_name: string
          id: string
          interests: string[] | null
          is_public: boolean | null
          kids_count: number | null
          looking_for: string[] | null
          organization_id: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          city: string
          created_at?: string
          full_name: string
          id?: string
          interests?: string[] | null
          is_public?: boolean | null
          kids_count?: number | null
          looking_for?: string[] | null
          organization_id?: string | null
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          interests?: string[] | null
          is_public?: boolean | null
          kids_count?: number | null
          looking_for?: string[] | null
          organization_id?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      connection_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          message: string | null
          organization_id: string | null
          status: string | null
          to_user_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          organization_id?: string | null
          status?: string | null
          to_user_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          organization_id?: string | null
          status?: string | null
          to_user_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coop_classes: {
        Row: {
          class_name: string
          coop_id: string
          created_at: string
          day_of_week: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          location: string | null
          max_students: number | null
          organization_id: string | null
          start_time: string | null
          subject: string | null
          supply_list: string | null
          teacher_id: string | null
          teacher_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          class_name: string
          coop_id: string
          created_at?: string
          day_of_week?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_students?: number | null
          organization_id?: string | null
          start_time?: string | null
          subject?: string | null
          supply_list?: string | null
          teacher_id?: string | null
          teacher_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          class_name?: string
          coop_id?: string
          created_at?: string
          day_of_week?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_students?: number | null
          organization_id?: string | null
          start_time?: string | null
          subject?: string | null
          supply_list?: string | null
          teacher_id?: string | null
          teacher_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coop_classes_coop_id_fkey"
            columns: ["coop_id"]
            isOneToOne: false
            referencedRelation: "coops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coop_classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coop_members: {
        Row: {
          coop_id: string
          created_at: string | null
          id: string
          joined_at: string
          organization_id: string | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coop_id: string
          created_at?: string | null
          id?: string
          joined_at?: string
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coop_id?: string
          created_at?: string | null
          id?: string
          joined_at?: string
          organization_id?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coop_members_coop_id_fkey"
            columns: ["coop_id"]
            isOneToOne: false
            referencedRelation: "coops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coop_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      coops: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          organization_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coops_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      course_grades: {
        Row: {
          assignment_name: string | null
          assignment_type: string | null
          course_id: string
          created_at: string | null
          date_assigned: string | null
          date_completed: string | null
          date_due: string | null
          duration_minutes: number | null
          id: string
          lesson_id: string | null
          letter_grade: string | null
          notes: string | null
          organization_id: string | null
          percentage: number | null
          points_earned: number | null
          points_possible: number | null
          updated_at: string | null
          user_id: string | null
          weight: number | null
        }
        Insert: {
          assignment_name?: string | null
          assignment_type?: string | null
          course_id: string
          created_at?: string | null
          date_assigned?: string | null
          date_completed?: string | null
          date_due?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_id?: string | null
          letter_grade?: string | null
          notes?: string | null
          organization_id?: string | null
          percentage?: number | null
          points_earned?: number | null
          points_possible?: number | null
          updated_at?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          assignment_name?: string | null
          assignment_type?: string | null
          course_id?: string
          created_at?: string | null
          date_assigned?: string | null
          date_completed?: string | null
          date_due?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_id?: string | null
          letter_grade?: string | null
          notes?: string | null
          organization_id?: string | null
          percentage?: number | null
          points_earned?: number | null
          points_possible?: number | null
          updated_at?: string | null
          user_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grades_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_grades_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_code: string | null
          course_name: string
          course_type: string | null
          created_at: string | null
          credits: number | null
          description: string | null
          end_date: string | null
          final_grade: string | null
          final_percentage: number | null
          grade_level: string
          id: string
          kid_id: string
          letter_grade: string | null
          organization_id: string | null
          school_year: string | null
          semester: string | null
          start_date: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_code?: string | null
          course_name: string
          course_type?: string | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          end_date?: string | null
          final_grade?: string | null
          final_percentage?: number | null
          grade_level: string
          id?: string
          kid_id: string
          letter_grade?: string | null
          organization_id?: string | null
          school_year?: string | null
          semester?: string | null
          start_date?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_code?: string | null
          course_name?: string
          course_type?: string | null
          created_at?: string | null
          credits?: number | null
          description?: string | null
          end_date?: string | null
          final_grade?: string | null
          final_percentage?: number | null
          grade_level?: string
          id?: string
          kid_id?: string
          letter_grade?: string | null
          organization_id?: string | null
          school_year?: string | null
          semester?: string | null
          start_date?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_imports: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          import_date: string | null
          import_source: string | null
          lessons_created: number | null
          metadata: Json | null
          organization_id: string
          planning_period_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          import_date?: string | null
          import_source?: string | null
          lessons_created?: number | null
          metadata?: Json | null
          organization_id: string
          planning_period_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          import_date?: string | null
          import_source?: string | null
          lessons_created?: number | null
          metadata?: Json | null
          organization_id?: string
          planning_period_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_imports_planning_period_id_fkey"
            columns: ["planning_period_id"]
            isOneToOne: false
            referencedRelation: "current_planning_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_imports_planning_period_id_fkey"
            columns: ["planning_period_id"]
            isOneToOne: false
            referencedRelation: "planning_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_attendance: {
        Row: {
          attendance_date: string
          auto_generated: boolean | null
          created_at: string | null
          hours: number | null
          id: string
          kid_id: string | null
          notes: string | null
          organization_id: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attendance_date: string
          auto_generated?: boolean | null
          created_at?: string | null
          hours?: number | null
          id?: string
          kid_id?: string | null
          notes?: string | null
          organization_id: string
          status: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attendance_date?: string
          auto_generated?: boolean | null
          created_at?: string | null
          hours?: number | null
          id?: string
          kid_id?: string | null
          notes?: string | null
          organization_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_attendance_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_notes: {
        Row: {
          created_at: string | null
          id: string
          note_date: string
          note_text: string | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_date: string
          note_text?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_date?: string
          note_text?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          attendee_email: string | null
          attendee_name: string
          created_at: string
          event_id: string
          id: string
          notes: string | null
          num_children: number | null
          organization_id: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attendee_email?: string | null
          attendee_name: string
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          num_children?: number | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attendee_email?: string | null
          attendee_name?: string
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          num_children?: number | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "social_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_events: {
        Row: {
          all_day: boolean | null
          calendar_connection_id: string | null
          calendar_email: string
          created_at: string | null
          description: string | null
          end_time: string
          external_event_id: string
          id: string
          is_deleted: boolean | null
          last_synced_at: string | null
          location: string | null
          organization_id: string | null
          provider: string
          start_time: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          all_day?: boolean | null
          calendar_connection_id?: string | null
          calendar_email: string
          created_at?: string | null
          description?: string | null
          end_time: string
          external_event_id: string
          id?: string
          is_deleted?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          organization_id?: string | null
          provider: string
          start_time: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          all_day?: boolean | null
          calendar_connection_id?: string | null
          calendar_email?: string
          created_at?: string | null
          description?: string | null
          end_time?: string
          external_event_id?: string
          id?: string
          is_deleted?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          organization_id?: string | null
          provider?: string
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_events_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      extracurriculars: {
        Row: {
          activity_name: string
          activity_type: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          grade_levels: string[] | null
          id: string
          kid_id: string
          organization_id: string | null
          role: string | null
          start_date: string | null
          total_hours: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activity_name: string
          activity_type?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          grade_levels?: string[] | null
          id?: string
          kid_id: string
          organization_id?: string | null
          role?: string | null
          start_date?: string | null
          total_hours?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activity_name?: string
          activity_type?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          grade_levels?: string[] | null
          id?: string
          kid_id?: string
          organization_id?: string | null
          role?: string | null
          start_date?: string | null
          total_hours?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracurriculars_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracurriculars_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      family_collaborators: {
        Row: {
          added_at: string
          created_at: string | null
          email: string
          id: string
          name: string
          organization_id: string | null
          owner_id: string
          permissions: Json | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          created_at?: string | null
          email: string
          id?: string
          name: string
          organization_id?: string | null
          owner_id: string
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          organization_id?: string | null
          owner_id?: string
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_collaborators_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      family_notes: {
        Row: {
          created_at: string | null
          id: string
          note_text: string | null
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_text?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_text?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_activities: {
        Row: {
          activity_type: string | null
          ai_prompt_context: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          generated_by_ai: boolean | null
          id: string
          instructions: string | null
          is_archived: boolean | null
          is_favorite: boolean | null
          kid_id: string | null
          last_used_date: string | null
          materials_needed: string | null
          organization_id: string
          standard_id: string
          title: string
          updated_at: string | null
          used_count: number | null
          user_id: string | null
        }
        Insert: {
          activity_type?: string | null
          ai_prompt_context?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          generated_by_ai?: boolean | null
          id?: string
          instructions?: string | null
          is_archived?: boolean | null
          is_favorite?: boolean | null
          kid_id?: string | null
          last_used_date?: string | null
          materials_needed?: string | null
          organization_id: string
          standard_id: string
          title: string
          updated_at?: string | null
          used_count?: number | null
          user_id?: string | null
        }
        Update: {
          activity_type?: string | null
          ai_prompt_context?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          generated_by_ai?: boolean | null
          id?: string
          instructions?: string | null
          is_archived?: boolean | null
          is_favorite?: boolean | null
          kid_id?: string | null
          last_used_date?: string | null
          materials_needed?: string | null
          organization_id?: string
          standard_id?: string
          title?: string
          updated_at?: string | null
          used_count?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_activities_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      help_conversations: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      help_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          organization_id: string | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          role: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "help_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "help_conversation_summaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "help_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      honors_awards: {
        Row: {
          created_at: string | null
          date_received: string | null
          description: string | null
          honor_name: string
          honor_type: string | null
          id: string
          kid_id: string
          organization_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_received?: string | null
          description?: string | null
          honor_name: string
          honor_type?: string | null
          id?: string
          kid_id: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_received?: string | null
          description?: string | null
          honor_name?: string
          honor_type?: string | null
          id?: string
          kid_id?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "honors_awards_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honors_awards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kids: {
        Row: {
          age: number | null
          created_at: string
          current_focus: string | null
          current_hook: string | null
          displayname: string | null
          environmental_needs: string | null
          firstname: string | null
          grade: string | null
          id: string
          lastname: string | null
          learning_style: string | null
          organization_id: string
          pace_of_learning: string | null
          photo_url: string | null
          todays_vibe: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          current_focus?: string | null
          current_hook?: string | null
          displayname?: string | null
          environmental_needs?: string | null
          firstname?: string | null
          grade?: string | null
          id?: string
          lastname?: string | null
          learning_style?: string | null
          organization_id: string
          pace_of_learning?: string | null
          photo_url?: string | null
          todays_vibe?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          age?: number | null
          created_at?: string
          current_focus?: string | null
          current_hook?: string | null
          displayname?: string | null
          environmental_needs?: string | null
          firstname?: string | null
          grade?: string | null
          id?: string
          lastname?: string | null
          learning_style?: string | null
          organization_id?: string
          pace_of_learning?: string | null
          photo_url?: string | null
          todays_vibe?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kids_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_standards: {
        Row: {
          alignment_strength: string | null
          created_at: string | null
          id: string
          lesson_id: string
          notes: string | null
          organization_id: string | null
          updated_at: string | null
          user_id: string | null
          user_standard_id: string
        }
        Insert: {
          alignment_strength?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_standard_id: string
        }
        Update: {
          alignment_strength?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_standard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_standards_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_standards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_standards_user_standard_id_fkey"
            columns: ["user_standard_id"]
            isOneToOne: false
            referencedRelation: "user_standards"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          description: string | null
          duration: string | null
          duration_minutes: number | null
          id: string
          kid_id: string | null
          lesson_date: string | null
          organization_id: string
          planned: boolean | null
          planning_period_id: string | null
          status: string
          subject: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          duration_minutes?: number | null
          id?: string
          kid_id?: string | null
          lesson_date?: string | null
          organization_id: string
          planned?: boolean | null
          planning_period_id?: string | null
          status?: string
          subject?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          duration_minutes?: number | null
          id?: string
          kid_id?: string | null
          lesson_date?: string | null
          organization_id?: string
          planned?: boolean | null
          planning_period_id?: string | null
          status?: string
          subject?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_planning_period_id_fkey"
            columns: ["planning_period_id"]
            isOneToOne: false
            referencedRelation: "current_planning_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_planning_period_id_fkey"
            columns: ["planning_period_id"]
            isOneToOne: false
            referencedRelation: "planning_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          condition: string | null
          created_at: string
          grade_level: string | null
          id: string
          license_expires: string | null
          login_info: string | null
          material_type: string
          name: string
          notes: string | null
          organization_id: string
          publisher: string | null
          quantity: number | null
          subject: string | null
          type: string | null
          updated_at: string
          url: string | null
          user_id: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string
          grade_level?: string | null
          id?: string
          license_expires?: string | null
          login_info?: string | null
          material_type: string
          name: string
          notes?: string | null
          organization_id: string
          publisher?: string | null
          quantity?: number | null
          subject?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string
          grade_level?: string | null
          id?: string
          license_expires?: string | null
          login_info?: string | null
          material_type?: string
          name?: string
          notes?: string | null
          organization_id?: string
          publisher?: string | null
          quantity?: number | null
          subject?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          organization_id: string | null
          schedule_config: Json | null
          schedule_type: string | null
          school_year: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          organization_id?: string | null
          schedule_config?: Json | null
          schedule_type?: string | null
          school_year?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          schedule_config?: Json | null
          schedule_type?: string | null
          school_year?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_periods: {
        Row: {
          created_at: string | null
          end_date: string
          goals: string | null
          id: string
          is_active: boolean | null
          organization_id: string
          period_name: string
          period_type: string | null
          school_year_config_id: string | null
          start_date: string
          target_school_year: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          goals?: string | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          period_name?: string
          period_type?: string | null
          school_year_config_id?: string | null
          start_date: string
          target_school_year?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          goals?: string | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          period_name?: string
          period_type?: string | null
          school_year_config_id?: string | null
          start_date?: string
          target_school_year?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_periods_school_year_config_id_fkey"
            columns: ["school_year_config_id"]
            isOneToOne: false
            referencedRelation: "school_year_config"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_tasks: {
        Row: {
          auto_completed: boolean | null
          completed_at: string | null
          completion_metadata: Json | null
          completion_source: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          notes: string | null
          organization_id: string
          planning_period_id: string | null
          task_category: string
          task_key: string
          task_label: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auto_completed?: boolean | null
          completed_at?: string | null
          completion_metadata?: Json | null
          completion_source?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          organization_id: string
          planning_period_id?: string | null
          task_category: string
          task_key: string
          task_label: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auto_completed?: boolean | null
          completed_at?: string | null
          completion_metadata?: Json | null
          completion_source?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          notes?: string | null
          organization_id?: string
          planning_period_id?: string | null
          task_category?: string
          task_key?: string
          task_label?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_tasks_planning_period_id_fkey"
            columns: ["planning_period_id"]
            isOneToOne: false
            referencedRelation: "current_planning_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_tasks_planning_period_id_fkey"
            columns: ["planning_period_id"]
            isOneToOne: false
            referencedRelation: "planning_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      school_schedules: {
        Row: {
          created_at: string | null
          friday_school: boolean | null
          id: string
          kid_id: string
          monday_school: boolean | null
          organization_id: string
          saturday_school: boolean | null
          sunday_school: boolean | null
          thursday_school: boolean | null
          tuesday_school: boolean | null
          updated_at: string | null
          user_id: string | null
          wednesday_school: boolean | null
        }
        Insert: {
          created_at?: string | null
          friday_school?: boolean | null
          id?: string
          kid_id: string
          monday_school?: boolean | null
          organization_id: string
          saturday_school?: boolean | null
          sunday_school?: boolean | null
          thursday_school?: boolean | null
          tuesday_school?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          wednesday_school?: boolean | null
        }
        Update: {
          created_at?: string | null
          friday_school?: boolean | null
          id?: string
          kid_id?: string
          monday_school?: boolean | null
          organization_id?: string
          saturday_school?: boolean | null
          sunday_school?: boolean | null
          thursday_school?: boolean | null
          tuesday_school?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          wednesday_school?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "school_schedules_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: true
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
        ]
      }
      school_year_config: {
        Row: {
          active: boolean | null
          created_at: string | null
          cycle_start_date: string | null
          id: string
          organization_id: string
          school_days: Json | null
          school_year_end_date: string
          school_year_start_date: string
          school_year_type: string
          updated_at: string | null
          user_id: string | null
          weeks_off: number | null
          weeks_on: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          cycle_start_date?: string | null
          id?: string
          organization_id: string
          school_days?: Json | null
          school_year_end_date: string
          school_year_start_date: string
          school_year_type: string
          updated_at?: string | null
          user_id?: string | null
          weeks_off?: number | null
          weeks_on?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          cycle_start_date?: string | null
          id?: string
          organization_id?: string
          school_days?: Json | null
          school_year_end_date?: string
          school_year_start_date?: string
          school_year_type?: string
          updated_at?: string | null
          user_id?: string | null
          weeks_off?: number | null
          weeks_on?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_year_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      school_year_settings: {
        Row: {
          annual_goal_type: string | null
          annual_goal_value: number | null
          created_at: string
          homeschool_days: string[] | null
          id: string
          organization_id: string
          school_type: string | null
          school_year_end: string | null
          school_year_start: string | null
          updated_at: string
          user_id: string | null
          weekly_goal_hours: number | null
        }
        Insert: {
          annual_goal_type?: string | null
          annual_goal_value?: number | null
          created_at?: string
          homeschool_days?: string[] | null
          id?: string
          organization_id: string
          school_type?: string | null
          school_year_end?: string | null
          school_year_start?: string | null
          updated_at?: string
          user_id?: string | null
          weekly_goal_hours?: number | null
        }
        Update: {
          annual_goal_type?: string | null
          annual_goal_value?: number | null
          created_at?: string
          homeschool_days?: string[] | null
          id?: string
          organization_id?: string
          school_type?: string | null
          school_year_end?: string | null
          school_year_start?: string | null
          updated_at?: string
          user_id?: string | null
          weekly_goal_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_year_settings_org_fk"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      social_events: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string | null
          id: string
          is_public: boolean | null
          location: string
          max_attendees: number | null
          organization_id: string | null
          organizer_email: string
          organizer_name: string
          rsvp_deadline: string | null
          start_time: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          is_public?: boolean | null
          location: string
          max_attendees?: number | null
          organization_id?: string | null
          organizer_email: string
          organizer_name: string
          rsvp_deadline?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          is_public?: boolean | null
          location?: string
          max_attendees?: number | null
          organization_id?: string | null
          organizer_email?: string
          organizer_name?: string
          rsvp_deadline?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      standard_templates: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string
          domain: string | null
          downloads_count: number | null
          effective_year: number | null
          framework: string | null
          full_statement: string | null
          grade_level: string
          id: string
          import_method: string | null
          is_active: boolean | null
          is_official: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          organization_id: string | null
          parent_standard_id: string | null
          source_name: string | null
          source_url: string | null
          standard_code: string
          state_code: string
          subject: string
          template_name: string | null
          template_version: string
          updated_at: string | null
          user_id: string | null
          verified_date: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          domain?: string | null
          downloads_count?: number | null
          effective_year?: number | null
          framework?: string | null
          full_statement?: string | null
          grade_level: string
          id?: string
          import_method?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          organization_id?: string | null
          parent_standard_id?: string | null
          source_name?: string | null
          source_url?: string | null
          standard_code: string
          state_code: string
          subject: string
          template_name?: string | null
          template_version: string
          updated_at?: string | null
          user_id?: string | null
          verified_date?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          domain?: string | null
          downloads_count?: number | null
          effective_year?: number | null
          framework?: string | null
          full_statement?: string | null
          grade_level?: string
          id?: string
          import_method?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          organization_id?: string | null
          parent_standard_id?: string | null
          source_name?: string | null
          source_url?: string | null
          standard_code?: string
          state_code?: string
          subject?: string
          template_name?: string | null
          template_version?: string
          updated_at?: string | null
          user_id?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standard_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      state_compliance_targets: {
        Row: {
          created_at: string | null
          grade_level: string
          id: string
          organization_id: string | null
          required_annual_days: number
          required_annual_hours: number
          state_code: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          grade_level: string
          id?: string
          organization_id?: string | null
          required_annual_days: number
          required_annual_hours: number
          state_code: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          grade_level?: string
          id?: string
          organization_id?: string | null
          required_annual_days?: number
          required_annual_hours?: number
          state_code?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "state_compliance_targets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      student_compliance_profiles: {
        Row: {
          confirmed_by_parent: boolean | null
          created_at: string | null
          end_date: string
          id: string
          kid_id: string | null
          organization_id: string | null
          start_date: string
          target_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          confirmed_by_parent?: boolean | null
          created_at?: string | null
          end_date?: string
          id?: string
          kid_id?: string | null
          organization_id?: string | null
          start_date?: string
          target_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          confirmed_by_parent?: boolean | null
          created_at?: string | null
          end_date?: string
          id?: string
          kid_id?: string | null
          organization_id?: string | null
          start_date?: string
          target_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_compliance_profiles_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_compliance_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_compliance_profiles_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "state_compliance_targets"
            referencedColumns: ["id"]
          },
        ]
      }
      student_standard_proficiency: {
        Row: {
          assessment_count: number | null
          created_at: string | null
          id: string
          kid_id: string
          last_assessed_date: string | null
          notes: string | null
          organization_id: string | null
          proficiency_level: string | null
          updated_at: string | null
          user_id: string | null
          user_standard_id: string
        }
        Insert: {
          assessment_count?: number | null
          created_at?: string | null
          id?: string
          kid_id: string
          last_assessed_date?: string | null
          notes?: string | null
          organization_id?: string | null
          proficiency_level?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_standard_id: string
        }
        Update: {
          assessment_count?: number | null
          created_at?: string | null
          id?: string
          kid_id?: string
          last_assessed_date?: string | null
          notes?: string | null
          organization_id?: string | null
          proficiency_level?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_standard_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_standard_proficiency_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_standard_proficiency_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_standard_proficiency_user_standard_id_fkey"
            columns: ["user_standard_id"]
            isOneToOne: false
            referencedRelation: "user_standards"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_proficiency: {
        Row: {
          created_at: string | null
          id: string
          kid_id: string
          notes: string | null
          organization_id: string | null
          proficiency: string
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kid_id: string
          notes?: string | null
          organization_id?: string | null
          proficiency: string
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kid_id?: string
          notes?: string | null
          organization_id?: string | null
          proficiency?: string
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_proficiency_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_proficiency_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      synced_work_events: {
        Row: {
          attendees_count: number | null
          auto_blocked: boolean | null
          blocked_lesson_id: string | null
          calendar_connection_id: string
          conflict_severity: string | null
          conflicting_event_ids: string[] | null
          conflicting_lesson_ids: string[] | null
          created_at: string | null
          description: string | null
          end_time: string
          external_calendar_id: string
          external_event_id: string
          has_conflict: boolean | null
          id: string
          is_all_day: boolean | null
          is_deleted: boolean | null
          is_meeting: boolean | null
          is_recurring: boolean | null
          last_synced_at: string | null
          location: string | null
          organization_id: string
          recurring_event_id: string | null
          start_time: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attendees_count?: number | null
          auto_blocked?: boolean | null
          blocked_lesson_id?: string | null
          calendar_connection_id: string
          conflict_severity?: string | null
          conflicting_event_ids?: string[] | null
          conflicting_lesson_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          end_time: string
          external_calendar_id: string
          external_event_id: string
          has_conflict?: boolean | null
          id?: string
          is_all_day?: boolean | null
          is_deleted?: boolean | null
          is_meeting?: boolean | null
          is_recurring?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          organization_id: string
          recurring_event_id?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attendees_count?: number | null
          auto_blocked?: boolean | null
          blocked_lesson_id?: string | null
          calendar_connection_id?: string
          conflict_severity?: string | null
          conflicting_event_ids?: string[] | null
          conflicting_lesson_ids?: string[] | null
          created_at?: string | null
          description?: string | null
          end_time?: string
          external_calendar_id?: string
          external_event_id?: string
          has_conflict?: boolean | null
          id?: string
          is_all_day?: boolean | null
          is_deleted?: boolean | null
          is_meeting?: boolean | null
          is_recurring?: boolean | null
          last_synced_at?: string | null
          location?: string | null
          organization_id?: string
          recurring_event_id?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "synced_work_events_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "synced_work_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          created_at: string | null
          deprecated: boolean | null
          description: string | null
          display_name: string
          effective_date: string | null
          id: string
          is_current: boolean | null
          organization_id: string | null
          source_url: string | null
          standard_count: number | null
          state_code: string
          updated_at: string | null
          user_id: string | null
          version_code: string
        }
        Insert: {
          created_at?: string | null
          deprecated?: boolean | null
          description?: string | null
          display_name: string
          effective_date?: string | null
          id?: string
          is_current?: boolean | null
          organization_id?: string | null
          source_url?: string | null
          standard_count?: number | null
          state_code: string
          updated_at?: string | null
          user_id?: string | null
          version_code: string
        }
        Update: {
          created_at?: string | null
          deprecated?: boolean | null
          description?: string | null
          display_name?: string
          effective_date?: string | null
          id?: string
          is_current?: boolean | null
          organization_id?: string | null
          source_url?: string | null
          standard_count?: number | null
          state_code?: string
          updated_at?: string | null
          user_id?: string | null
          version_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_settings: {
        Row: {
          administrator_email: string | null
          administrator_name: string | null
          administrator_title: string | null
          class_rank: number | null
          class_size: number | null
          created_at: string | null
          grading_scale: Json | null
          graduation_date: string | null
          id: string
          kid_id: string
          organization_id: string | null
          school_address: string | null
          school_city: string | null
          school_name: string | null
          school_phone: string | null
          school_state: string | null
          school_zip: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          administrator_email?: string | null
          administrator_name?: string | null
          administrator_title?: string | null
          class_rank?: number | null
          class_size?: number | null
          created_at?: string | null
          grading_scale?: Json | null
          graduation_date?: string | null
          id?: string
          kid_id: string
          organization_id?: string | null
          school_address?: string | null
          school_city?: string | null
          school_name?: string | null
          school_phone?: string | null
          school_state?: string | null
          school_zip?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          administrator_email?: string | null
          administrator_name?: string | null
          administrator_title?: string | null
          class_rank?: number | null
          class_size?: number | null
          created_at?: string | null
          grading_scale?: Json | null
          graduation_date?: string | null
          id?: string
          kid_id?: string
          organization_id?: string | null
          school_address?: string | null
          school_city?: string | null
          school_name?: string | null
          school_phone?: string | null
          school_state?: string | null
          school_zip?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_settings_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: true
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcript_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_compliance_settings: {
        Row: {
          alert_threshold_percentage: number | null
          assessment_frequency: string | null
          assessment_notes: string | null
          created_at: string | null
          created_by: string | null
          id: string
          kid_id: string | null
          notes: string | null
          organization_id: string
          required_annual_days: number | null
          required_annual_hours: number | null
          required_subjects: Json | null
          school_year_end_date: string | null
          school_year_end_month: number | null
          school_year_start_date: string | null
          school_year_start_month: number | null
          state_code: string | null
          state_name: string | null
          state_website_url: string | null
          template_disclaimer_accepted: boolean | null
          template_last_verified_at: string | null
          template_source: string | null
          track_by_days: boolean | null
          track_by_hours: boolean | null
          track_by_subjects: boolean | null
          updated_at: string | null
          updated_by: string | null
          uploaded_documentation_url: string | null
          user_id: string | null
        }
        Insert: {
          alert_threshold_percentage?: number | null
          assessment_frequency?: string | null
          assessment_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          kid_id?: string | null
          notes?: string | null
          organization_id: string
          required_annual_days?: number | null
          required_annual_hours?: number | null
          required_subjects?: Json | null
          school_year_end_date?: string | null
          school_year_end_month?: number | null
          school_year_start_date?: string | null
          school_year_start_month?: number | null
          state_code?: string | null
          state_name?: string | null
          state_website_url?: string | null
          template_disclaimer_accepted?: boolean | null
          template_last_verified_at?: string | null
          template_source?: string | null
          track_by_days?: boolean | null
          track_by_hours?: boolean | null
          track_by_subjects?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          uploaded_documentation_url?: string | null
          user_id?: string | null
        }
        Update: {
          alert_threshold_percentage?: number | null
          assessment_frequency?: string | null
          assessment_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          kid_id?: string | null
          notes?: string | null
          organization_id?: string
          required_annual_days?: number | null
          required_annual_hours?: number | null
          required_subjects?: Json | null
          school_year_end_date?: string | null
          school_year_end_month?: number | null
          school_year_start_date?: string | null
          school_year_start_month?: number | null
          state_code?: string | null
          state_name?: string | null
          state_website_url?: string | null
          template_disclaimer_accepted?: boolean | null
          template_last_verified_at?: string | null
          template_source?: string | null
          track_by_days?: boolean | null
          track_by_hours?: boolean | null
          track_by_subjects?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          uploaded_documentation_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_compliance_settings_kid_id_fkey"
            columns: ["kid_id"]
            isOneToOne: false
            referencedRelation: "kids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_compliance_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string | null
          parent_name: string | null
          phone_number: string | null
          preferred_contact: string | null
          subscription_tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          parent_name?: string | null
          phone_number?: string | null
          preferred_contact?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string | null
          parent_name?: string | null
          phone_number?: string | null
          preferred_contact?: string | null
          subscription_tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_standards: {
        Row: {
          active: boolean | null
          code: string | null
          created_at: string | null
          customized: boolean | null
          description: string
          domain: string | null
          grade_level: string
          id: string
          imported_date: string | null
          organization_id: string
          parent_standard_id: string | null
          source: string
          standard_code: string
          state_code: string
          subject: string
          template_id: string | null
          template_version: string | null
          updated_at: string | null
          user_id: string | null
          user_notes: string | null
          verified_date: string | null
        }
        Insert: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          customized?: boolean | null
          description: string
          domain?: string | null
          grade_level: string
          id?: string
          imported_date?: string | null
          organization_id: string
          parent_standard_id?: string | null
          source?: string
          standard_code: string
          state_code: string
          subject: string
          template_id?: string | null
          template_version?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_notes?: string | null
          verified_date?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string | null
          created_at?: string | null
          customized?: boolean | null
          description?: string
          domain?: string | null
          grade_level?: string
          id?: string
          imported_date?: string | null
          organization_id?: string
          parent_standard_id?: string | null
          source?: string
          standard_code?: string
          state_code?: string
          subject?: string
          template_id?: string | null
          template_version?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_notes?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_standards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_standards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "community_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_standards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "official_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_standards_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "standard_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          organization_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end: string | null
          subscription_start: string | null
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          organization_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          organization_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          subscription_start?: string | null
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          school_year_config_id: string | null
          start_date: string
          updated_at: string | null
          user_id: string | null
          vacation_type: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          school_year_config_id?: string | null
          start_date: string
          updated_at?: string | null
          user_id?: string | null
          vacation_type?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          school_year_config_id?: string | null
          start_date?: string
          updated_at?: string | null
          user_id?: string | null
          vacation_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacation_periods_school_year_config_id_fkey"
            columns: ["school_year_config_id"]
            isOneToOne: false
            referencedRelation: "school_year_config"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      available_templates: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          domain: string | null
          downloads_count: number | null
          effective_year: number | null
          framework: string | null
          full_statement: string | null
          grade_level: string | null
          id: string | null
          import_method: string | null
          is_active: boolean | null
          is_official: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          organization_id: string | null
          parent_standard_id: string | null
          source_name: string | null
          source_url: string | null
          standard_code: string | null
          state_code: string | null
          subject: string | null
          template_name: string | null
          template_type: string | null
          template_version: string | null
          updated_at: string | null
          user_id: string | null
          verified_date: string | null
        }
        Relationships: []
      }
      community_templates: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          domain: string | null
          downloads_count: number | null
          effective_year: number | null
          framework: string | null
          full_statement: string | null
          grade_level: string | null
          id: string | null
          import_method: string | null
          is_active: boolean | null
          is_official: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          organization_id: string | null
          parent_standard_id: string | null
          source_name: string | null
          source_url: string | null
          standard_code: string | null
          state_code: string | null
          subject: string | null
          template_name: string | null
          template_type: string | null
          template_version: string | null
          updated_at: string | null
          user_id: string | null
          verified_date: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string | null
          downloads_count?: number | null
          effective_year?: number | null
          framework?: string | null
          full_statement?: string | null
          grade_level?: string | null
          id?: string | null
          import_method?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          organization_id?: string | null
          parent_standard_id?: string | null
          source_name?: string | null
          source_url?: string | null
          standard_code?: string | null
          state_code?: string | null
          subject?: string | null
          template_name?: string | null
          template_type?: never
          template_version?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_date?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string | null
          downloads_count?: number | null
          effective_year?: number | null
          framework?: string | null
          full_statement?: string | null
          grade_level?: string | null
          id?: string | null
          import_method?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          organization_id?: string | null
          parent_standard_id?: string | null
          source_name?: string | null
          source_url?: string | null
          standard_code?: string | null
          state_code?: string | null
          subject?: string | null
          template_name?: string | null
          template_type?: never
          template_version?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standard_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      current_planning_period: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string | null
          is_active: boolean | null
          organization_id: string | null
          period_name: string | null
          period_type: string | null
          schedule_config: Json | null
          schedule_type: string | null
          school_year_config_id: string | null
          start_date: string | null
          target_school_year: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planning_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_periods_school_year_config_id_fkey"
            columns: ["school_year_config_id"]
            isOneToOne: false
            referencedRelation: "school_year_config"
            referencedColumns: ["id"]
          },
        ]
      }
      help_conversation_summaries: {
        Row: {
          created_at: string | null
          id: string | null
          last_message_at: string | null
          message_count: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      official_templates: {
        Row: {
          code: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          domain: string | null
          downloads_count: number | null
          effective_year: number | null
          framework: string | null
          full_statement: string | null
          grade_level: string | null
          id: string | null
          import_method: string | null
          is_active: boolean | null
          is_official: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          organization_id: string | null
          parent_standard_id: string | null
          source_name: string | null
          source_url: string | null
          standard_code: string | null
          state_code: string | null
          subject: string | null
          template_name: string | null
          template_type: string | null
          template_version: string | null
          updated_at: string | null
          user_id: string | null
          verified_date: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string | null
          downloads_count?: number | null
          effective_year?: number | null
          framework?: string | null
          full_statement?: string | null
          grade_level?: string | null
          id?: string | null
          import_method?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          organization_id?: string | null
          parent_standard_id?: string | null
          source_name?: string | null
          source_url?: string | null
          standard_code?: string | null
          state_code?: string | null
          subject?: string | null
          template_name?: string | null
          template_type?: never
          template_version?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_date?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          domain?: string | null
          downloads_count?: number | null
          effective_year?: number | null
          framework?: string | null
          full_statement?: string | null
          grade_level?: string | null
          id?: string | null
          import_method?: string | null
          is_active?: boolean | null
          is_official?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          organization_id?: string | null
          parent_standard_id?: string | null
          source_name?: string | null
          source_url?: string | null
          standard_code?: string | null
          state_code?: string | null
          subject?: string | null
          template_name?: string | null
          template_type?: never
          template_version?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standard_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_compliance_hours: {
        Args: {
          p_end_date?: string
          p_kid_id: string
          p_organization_id: string
          p_start_date?: string
        }
        Returns: {
          hours_by_month: Json
          subject_hours: Json
          total_days: number
          total_hours: number
        }[]
      }
      calculate_course_credits: {
        Args: { course_uuid: string }
        Returns: number
      }
      calculate_gpa: {
        Args: { student_id: string; weighted?: boolean }
        Returns: number
      }
      clone_template_to_user: {
        Args: {
          p_organization_id: string
          p_state_code: string
          p_template_version: string
        }
        Returns: number
      }
      create_default_planning_tasks: {
        Args: { p_organization_id: string; p_planning_period_id: string }
        Returns: undefined
      }
      detect_calendar_conflicts: {
        Args: {
          p_end_time: string
          p_organization_id: string
          p_start_time: string
        }
        Returns: {
          conflict_type: string
          lesson_end: string
          lesson_id: string
          lesson_start: string
          lesson_title: string
        }[]
      }
      get_compliance_health_score: {
        Args: {
          p_end_date?: string
          p_kid_id: string
          p_organization_id: string
          p_start_date?: string
        }
        Returns: {
          alerts: Json
          days_score: number
          hours_score: number
          overall_score: number
          recommendations: Json
          status: string
          subjects_score: number
        }[]
      }
      get_school_days: {
        Args: {
          p_end_date: string
          p_organization_id: string
          p_start_date: string
        }
        Returns: {
          school_date: string
        }[]
      }
      user_has_standards: {
        Args: { p_organization_id: string; p_state_code: string }
        Returns: boolean
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
