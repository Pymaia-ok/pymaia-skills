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
      automation_logs: {
        Row: {
          action_type: string
          created_at: string
          function_name: string
          id: string
          metadata: Json | null
          reason: string
          skill_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          function_name: string
          id?: string
          metadata?: Json | null
          reason: string
          skill_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          function_name?: string
          id?: string
          metadata?: Json | null
          reason?: string
          skill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          clicked_at: string | null
          created_at: string
          id: string
          opened_at: string | null
          resend_id: string | null
          sequence_name: string | null
          status: string
          step_index: number | null
          subject: string
          to_email: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sequence_name?: string | null
          status: string
          step_index?: number | null
          subject: string
          to_email: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string | null
          resend_id?: string | null
          sequence_name?: string | null
          status?: string
          step_index?: number | null
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          created_at: string
          error: string | null
          html_body: string
          id: string
          metadata: Json | null
          scheduled_at: string
          sent_at: string | null
          sequence_id: string | null
          status: string
          step_index: number | null
          subject: string
          to_email: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          html_body: string
          id?: string
          metadata?: Json | null
          scheduled_at?: string
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          step_index?: number | null
          subject: string
          to_email: string
        }
        Update: {
          created_at?: string
          error?: string | null
          html_body?: string
          id?: string
          metadata?: Json | null
          scheduled_at?: string
          sent_at?: string | null
          sequence_id?: string | null
          status?: string
          step_index?: number | null
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          steps: Json
          trigger_event: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          steps?: Json
          trigger_event: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          steps?: Json
          trigger_event?: string
        }
        Relationships: []
      }
      installations: {
        Row: {
          created_at: string
          id: string
          skill_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          skill_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          skill_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installations_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          converted_at: string | null
          created_at: string
          email: string
          id: string
          skill_id: string | null
          source: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          email: string
          id?: string
          skill_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          skill_id?: string | null
          source?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_servers: {
        Row: {
          category: string
          config_json: Json | null
          created_at: string
          credentials_needed: string[]
          description: string
          description_es: string | null
          docs_url: string | null
          external_use_count: number | null
          github_stars: number | null
          github_url: string | null
          homepage: string | null
          icon_url: string | null
          id: string
          install_command: string
          install_count: number
          is_official: boolean
          last_commit_at: string | null
          name: string
          security_checked_at: string | null
          security_notes: string | null
          security_status: string
          slug: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          config_json?: Json | null
          created_at?: string
          credentials_needed?: string[]
          description?: string
          description_es?: string | null
          docs_url?: string | null
          external_use_count?: number | null
          github_stars?: number | null
          github_url?: string | null
          homepage?: string | null
          icon_url?: string | null
          id?: string
          install_command?: string
          install_count?: number
          is_official?: boolean
          last_commit_at?: string | null
          name: string
          security_checked_at?: string | null
          security_notes?: string | null
          security_status?: string
          slug: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          config_json?: Json | null
          created_at?: string
          credentials_needed?: string[]
          description?: string
          description_es?: string | null
          docs_url?: string | null
          external_use_count?: number | null
          github_stars?: number | null
          github_url?: string | null
          homepage?: string | null
          icon_url?: string | null
          id?: string
          install_command?: string
          install_count?: number
          is_official?: boolean
          last_commit_at?: string | null
          name?: string
          security_checked_at?: string | null
          security_notes?: string | null
          security_status?: string
          slug?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rating: number
          skill_id: string
          time_saved: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          skill_id: string
          time_saved?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          skill_id?: string
          time_saved?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_enrollments: {
        Row: {
          completed_at: string | null
          current_step: number
          email: string
          enrolled_at: string
          id: string
          metadata: Json | null
          sequence_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          email: string
          enrolled_at?: string
          id?: string
          metadata?: Json | null
          sequence_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          email?: string
          enrolled_at?: string
          id?: string
          metadata?: Json | null
          sequence_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_bundles: {
        Row: {
          created_at: string | null
          description: string
          description_es: string | null
          hero_emoji: string | null
          id: string
          is_active: boolean | null
          role_slug: string
          skill_slugs: string[]
          title: string
          title_es: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          description_es?: string | null
          hero_emoji?: string | null
          id?: string
          is_active?: boolean | null
          role_slug: string
          skill_slugs?: string[]
          title: string
          title_es?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          description_es?: string | null
          hero_emoji?: string | null
          id?: string
          is_active?: boolean | null
          role_slug?: string
          skill_slugs?: string[]
          title?: string
          title_es?: string | null
        }
        Relationships: []
      }
      skill_drafts: {
        Row: {
          conversation: Json
          created_at: string
          generated_skill: Json | null
          id: string
          quality_feedback: string | null
          quality_score: number | null
          status: string
          test_results: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation?: Json
          created_at?: string
          generated_skill?: Json | null
          id?: string
          quality_feedback?: string | null
          quality_score?: number | null
          status?: string
          test_results?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation?: Json
          created_at?: string
          generated_skill?: Json | null
          id?: string
          quality_feedback?: string | null
          quality_score?: number | null
          status?: string
          test_results?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          auto_approved_reason: string | null
          avg_rating: number
          category: string
          created_at: string
          creator_id: string | null
          description_human: string
          description_human_es: string | null
          display_name: string
          display_name_es: string | null
          github_stars: number
          github_url: string | null
          id: string
          industry: string[]
          install_command: string
          install_count: number
          is_public: boolean
          last_commit_at: string | null
          price_amount: number | null
          pricing_model: string
          quality_score: number | null
          readme_raw: string | null
          readme_summary: string | null
          required_mcps: Json | null
          review_count: number
          search_vector: unknown
          security_checked_at: string | null
          security_notes: string | null
          security_status: string
          share_token: string | null
          slug: string
          status: string
          tagline: string
          tagline_es: string | null
          target_roles: string[]
          time_to_install_minutes: number
          updated_at: string
          use_cases: Json
          video_url: string | null
        }
        Insert: {
          auto_approved_reason?: string | null
          avg_rating?: number
          category?: string
          created_at?: string
          creator_id?: string | null
          description_human: string
          description_human_es?: string | null
          display_name: string
          display_name_es?: string | null
          github_stars?: number
          github_url?: string | null
          id?: string
          industry?: string[]
          install_command: string
          install_count?: number
          is_public?: boolean
          last_commit_at?: string | null
          price_amount?: number | null
          pricing_model?: string
          quality_score?: number | null
          readme_raw?: string | null
          readme_summary?: string | null
          required_mcps?: Json | null
          review_count?: number
          search_vector?: unknown
          security_checked_at?: string | null
          security_notes?: string | null
          security_status?: string
          share_token?: string | null
          slug: string
          status?: string
          tagline: string
          tagline_es?: string | null
          target_roles?: string[]
          time_to_install_minutes?: number
          updated_at?: string
          use_cases?: Json
          video_url?: string | null
        }
        Update: {
          auto_approved_reason?: string | null
          avg_rating?: number
          category?: string
          created_at?: string
          creator_id?: string | null
          description_human?: string
          description_human_es?: string | null
          display_name?: string
          display_name_es?: string | null
          github_stars?: number
          github_url?: string | null
          id?: string
          industry?: string[]
          install_command?: string
          install_count?: number
          is_public?: boolean
          last_commit_at?: string | null
          price_amount?: number | null
          pricing_model?: string
          quality_score?: number | null
          readme_raw?: string | null
          readme_summary?: string | null
          required_mcps?: Json | null
          review_count?: number
          search_vector?: unknown
          security_checked_at?: string | null
          security_notes?: string | null
          security_status?: string
          share_token?: string | null
          slug?: string
          status?: string
          tagline?: string
          tagline_es?: string | null
          target_roles?: string[]
          time_to_install_minutes?: number
          updated_at?: string
          use_cases?: Json
          video_url?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fetch_skill_by_share_token: {
        Args: { _slug: string; _token: string }
        Returns: {
          auto_approved_reason: string | null
          avg_rating: number
          category: string
          created_at: string
          creator_id: string | null
          description_human: string
          description_human_es: string | null
          display_name: string
          display_name_es: string | null
          github_stars: number
          github_url: string | null
          id: string
          industry: string[]
          install_command: string
          install_count: number
          is_public: boolean
          last_commit_at: string | null
          price_amount: number | null
          pricing_model: string
          quality_score: number | null
          readme_raw: string | null
          readme_summary: string | null
          required_mcps: Json | null
          review_count: number
          search_vector: unknown
          security_checked_at: string | null
          security_notes: string | null
          security_status: string
          share_token: string | null
          slug: string
          status: string
          tagline: string
          tagline_es: string | null
          target_roles: string[]
          time_to_install_minutes: number
          updated_at: string
          use_cases: Json
          video_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "skills"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_skills: {
        Args: {
          filter_category?: string
          filter_industry?: string
          filter_roles?: string[]
          page_num?: number
          page_size?: number
          search_query: string
          sort_by?: string
        }
        Returns: {
          avg_rating: number
          category: string
          created_at: string
          creator_id: string
          description_human: string
          description_human_es: string
          display_name: string
          display_name_es: string
          github_stars: number
          github_url: string
          id: string
          industry: string[]
          install_command: string
          install_count: number
          review_count: number
          similarity_score: number
          slug: string
          status: string
          tagline: string
          tagline_es: string
          target_roles: string[]
          time_to_install_minutes: number
          total_count: number
          use_cases: Json
          video_url: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
