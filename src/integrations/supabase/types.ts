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
      agent_analytics: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          goal: string | null
          id: string
          items_recommended: string[] | null
          tool_name: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          goal?: string | null
          id?: string
          items_recommended?: string[] | null
          tool_name?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          goal?: string | null
          id?: string
          items_recommended?: string[] | null
          tool_name?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          key_salt: string | null
          label: string
          last_used_at: string | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          key_salt?: string | null
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          key_salt?: string | null
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
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
      blog_posts: {
        Row: {
          category: string
          content: string
          content_es: string | null
          cover_image_prompt: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string
          excerpt_es: string | null
          faq_json: Json | null
          geo_target: string
          id: string
          keywords: string[] | null
          meta_description: string | null
          meta_description_es: string | null
          reading_time_minutes: number | null
          related_connector_slugs: string[] | null
          related_skill_slugs: string[] | null
          slug: string
          status: string
          title: string
          title_es: string | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          category?: string
          content?: string
          content_es?: string | null
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          excerpt_es?: string | null
          faq_json?: Json | null
          geo_target?: string
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          meta_description_es?: string | null
          reading_time_minutes?: number | null
          related_connector_slugs?: string[] | null
          related_skill_slugs?: string[] | null
          slug: string
          status?: string
          title: string
          title_es?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          category?: string
          content?: string
          content_es?: string | null
          cover_image_prompt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string
          excerpt_es?: string | null
          faq_json?: Json | null
          geo_target?: string
          id?: string
          keywords?: string[] | null
          meta_description?: string | null
          meta_description_es?: string | null
          reading_time_minutes?: number | null
          related_connector_slugs?: string[] | null
          related_skill_slugs?: string[] | null
          slug?: string
          status?: string
          title?: string
          title_es?: string | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: []
      }
      community_goal_templates: {
        Row: {
          capabilities: Json
          created_at: string
          description: string
          display_name: string
          domain: string
          example_solutions: Json
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: string
          triggers: string[]
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          description?: string
          display_name: string
          domain?: string
          example_solutions?: Json
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          status?: string
          triggers?: string[]
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          capabilities?: Json
          created_at?: string
          description?: string
          display_name?: string
          domain?: string
          example_solutions?: Json
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          status?: string
          triggers?: string[]
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: []
      }
      compatibility_matrix: {
        Row: {
          created_at: string
          data_flow: string | null
          id: string
          item_a_slug: string
          item_a_type: string
          item_b_slug: string
          item_b_type: string
          reason: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_flow?: string | null
          id?: string
          item_a_slug: string
          item_a_type?: string
          item_b_slug: string
          item_b_type?: string
          reason?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_flow?: string | null
          id?: string
          item_a_slug?: string
          item_a_type?: string
          item_b_slug?: string
          item_b_type?: string
          reason?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_modules: {
        Row: {
          content_md: string
          content_md_es: string | null
          course_id: string
          created_at: string
          estimated_minutes: number
          id: string
          quiz_json: Json
          recommended_connector_slugs: string[]
          recommended_skill_slugs: string[]
          sort_order: number
          title: string
          title_es: string | null
        }
        Insert: {
          content_md?: string
          content_md_es?: string | null
          course_id: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          quiz_json?: Json
          recommended_connector_slugs?: string[]
          recommended_skill_slugs?: string[]
          sort_order?: number
          title: string
          title_es?: string | null
        }
        Update: {
          content_md?: string
          content_md_es?: string | null
          course_id?: string
          created_at?: string
          estimated_minutes?: number
          id?: string
          quiz_json?: Json
          recommended_connector_slugs?: string[]
          recommended_skill_slugs?: string[]
          sort_order?: number
          title?: string
          title_es?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          module_id: string
          quiz_score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          module_id: string
          quiz_score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          module_id?: string
          quiz_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string
          description_es: string | null
          difficulty: string
          emoji: string | null
          estimated_minutes: number
          id: string
          is_active: boolean
          module_count: number
          role_slug: string
          slug: string
          title: string
          title_es: string | null
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string
          description_es?: string | null
          difficulty?: string
          emoji?: string | null
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          module_count?: number
          role_slug?: string
          slug: string
          title: string
          title_es?: string | null
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string
          description_es?: string | null
          difficulty?: string
          emoji?: string | null
          estimated_minutes?: number
          id?: string
          is_active?: boolean
          module_count?: number
          role_slug?: string
          slug?: string
          title?: string
          title_es?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      creators: {
        Row: {
          avatar_url: string | null
          avg_rating: number
          avg_trust_score: number
          bio: string | null
          company: string | null
          connector_count: number
          created_at: string
          display_name: string | null
          fetched_at: string | null
          github_followers: number
          github_username: string
          id: string
          is_organization: boolean
          plugin_count: number
          skill_count: number
          top_category: string | null
          total_installs: number
          verified: boolean
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          avg_rating?: number
          avg_trust_score?: number
          bio?: string | null
          company?: string | null
          connector_count?: number
          created_at?: string
          display_name?: string | null
          fetched_at?: string | null
          github_followers?: number
          github_username: string
          id?: string
          is_organization?: boolean
          plugin_count?: number
          skill_count?: number
          top_category?: string | null
          total_installs?: number
          verified?: boolean
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          avg_rating?: number
          avg_trust_score?: number
          bio?: string | null
          company?: string | null
          connector_count?: number
          created_at?: string
          display_name?: string | null
          fetched_at?: string | null
          github_followers?: number
          github_username?: string
          id?: string
          is_organization?: boolean
          plugin_count?: number
          skill_count?: number
          top_category?: string | null
          total_installs?: number
          verified?: boolean
          website?: string | null
        }
        Relationships: []
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
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
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enterprise_applications: {
        Row: {
          api_documentation_url: string | null
          company_description: string | null
          company_name: string
          company_website: string | null
          contact_email: string
          created_at: string
          id: string
          plugin_slugs: string[]
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_documentation_url?: string | null
          company_description?: string | null
          company_name: string
          company_website?: string | null
          contact_email: string
          created_at?: string
          id?: string
          plugin_slugs?: string[]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_documentation_url?: string | null
          company_description?: string | null
          company_name?: string
          company_website?: string | null
          contact_email?: string
          created_at?: string
          id?: string
          plugin_slugs?: string[]
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enterprise_catalogs: {
        Row: {
          allowed_domains: string[]
          company_name: string
          company_slug: string
          created_at: string
          custom_goal_templates: Json
          description: string | null
          id: string
          is_active: boolean
          owner_user_id: string
          private_tool_slugs: string[]
          settings: Json
          updated_at: string
        }
        Insert: {
          allowed_domains?: string[]
          company_name: string
          company_slug: string
          created_at?: string
          custom_goal_templates?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          owner_user_id: string
          private_tool_slugs?: string[]
          settings?: Json
          updated_at?: string
        }
        Update: {
          allowed_domains?: string[]
          company_name?: string
          company_slug?: string
          created_at?: string
          custom_goal_templates?: Json
          description?: string | null
          id?: string
          is_active?: boolean
          owner_user_id?: string
          private_tool_slugs?: string[]
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      github_metadata: {
        Row: {
          archived: boolean
          contributor_count: number
          description: string | null
          fetch_status: string
          fetched_at: string | null
          forks: number
          last_commit_at: string | null
          last_push_at: string | null
          license: string | null
          open_issues: number
          repo_full_name: string
          stars: number
          topics: string[]
        }
        Insert: {
          archived?: boolean
          contributor_count?: number
          description?: string | null
          fetch_status?: string
          fetched_at?: string | null
          forks?: number
          last_commit_at?: string | null
          last_push_at?: string | null
          license?: string | null
          open_issues?: number
          repo_full_name: string
          stars?: number
          topics?: string[]
        }
        Update: {
          archived?: boolean
          contributor_count?: number
          description?: string | null
          fetch_status?: string
          fetched_at?: string | null
          forks?: number
          last_commit_at?: string | null
          last_push_at?: string | null
          license?: string | null
          open_issues?: number
          repo_full_name?: string
          stars?: number
          topics?: string[]
        }
        Relationships: []
      }
      goal_templates: {
        Row: {
          capabilities: Json
          created_at: string
          description: string
          description_es: string | null
          difficulty: string | null
          display_name: string
          display_name_es: string | null
          domain: string
          estimated_time_minutes: number | null
          example_solutions: Json
          id: string
          is_active: boolean
          recommended_skills: string[] | null
          slug: string
          triggers: string[]
          updated_at: string
          usage_count: number
        }
        Insert: {
          capabilities?: Json
          created_at?: string
          description?: string
          description_es?: string | null
          difficulty?: string | null
          display_name: string
          display_name_es?: string | null
          domain?: string
          estimated_time_minutes?: number | null
          example_solutions?: Json
          id?: string
          is_active?: boolean
          recommended_skills?: string[] | null
          slug: string
          triggers?: string[]
          updated_at?: string
          usage_count?: number
        }
        Update: {
          capabilities?: Json
          created_at?: string
          description?: string
          description_es?: string | null
          difficulty?: string | null
          display_name?: string
          display_name_es?: string | null
          domain?: string
          estimated_time_minutes?: number | null
          example_solutions?: Json
          id?: string
          is_active?: boolean
          recommended_skills?: string[] | null
          slug?: string
          triggers?: string[]
          updated_at?: string
          usage_count?: number
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
          approved_content_hash: string | null
          category: string
          config_json: Json | null
          created_at: string
          credentials_needed: string[]
          description: string
          description_es: string | null
          docs_url: string | null
          embedding: string | null
          external_use_count: number | null
          github_stars: number | null
          github_url: string | null
          homepage: string | null
          icon_url: string | null
          id: string
          install_command: string
          install_count: number
          is_official: boolean
          is_stale: boolean | null
          last_commit_at: string | null
          name: string
          readme_raw: string | null
          readme_summary: string | null
          security_checked_at: string | null
          security_notes: string | null
          security_scan_result: Json | null
          security_scanned_at: string | null
          security_status: string
          slug: string
          source: string | null
          status: string
          trust_score: number | null
          updated_at: string
        }
        Insert: {
          approved_content_hash?: string | null
          category?: string
          config_json?: Json | null
          created_at?: string
          credentials_needed?: string[]
          description?: string
          description_es?: string | null
          docs_url?: string | null
          embedding?: string | null
          external_use_count?: number | null
          github_stars?: number | null
          github_url?: string | null
          homepage?: string | null
          icon_url?: string | null
          id?: string
          install_command?: string
          install_count?: number
          is_official?: boolean
          is_stale?: boolean | null
          last_commit_at?: string | null
          name: string
          readme_raw?: string | null
          readme_summary?: string | null
          security_checked_at?: string | null
          security_notes?: string | null
          security_scan_result?: Json | null
          security_scanned_at?: string | null
          security_status?: string
          slug: string
          source?: string | null
          status?: string
          trust_score?: number | null
          updated_at?: string
        }
        Update: {
          approved_content_hash?: string | null
          category?: string
          config_json?: Json | null
          created_at?: string
          credentials_needed?: string[]
          description?: string
          description_es?: string | null
          docs_url?: string | null
          embedding?: string | null
          external_use_count?: number | null
          github_stars?: number | null
          github_url?: string | null
          homepage?: string | null
          icon_url?: string | null
          id?: string
          install_command?: string
          install_count?: number
          is_official?: boolean
          is_stale?: boolean | null
          last_commit_at?: string | null
          name?: string
          readme_raw?: string | null
          readme_summary?: string | null
          security_checked_at?: string | null
          security_notes?: string | null
          security_scan_result?: Json | null
          security_scanned_at?: string | null
          security_status?: string
          slug?: string
          source?: string | null
          status?: string
          trust_score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      monorepo_registry: {
        Row: {
          created_at: string
          discovered_via: string | null
          github_stars: number | null
          id: string
          last_synced_at: string | null
          repo_full_name: string
          skill_count: number | null
        }
        Insert: {
          created_at?: string
          discovered_via?: string | null
          github_stars?: number | null
          id?: string
          last_synced_at?: string | null
          repo_full_name: string
          skill_count?: number | null
        }
        Update: {
          created_at?: string
          discovered_via?: string | null
          github_stars?: number | null
          id?: string
          last_synced_at?: string | null
          repo_full_name?: string
          skill_count?: number | null
        }
        Relationships: []
      }
      plugin_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          plugin_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          plugin_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          plugin_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_reviews_plugin_id_fkey"
            columns: ["plugin_id"]
            isOneToOne: false
            referencedRelation: "plugins"
            referencedColumns: ["id"]
          },
        ]
      }
      plugins: {
        Row: {
          approved_content_hash: string | null
          avg_rating: number
          category: string
          created_at: string
          creator_id: string | null
          description: string
          description_es: string | null
          embedding: string | null
          github_stars: number
          github_url: string | null
          homepage: string | null
          icon_url: string | null
          id: string
          install_count: number
          is_anthropic_verified: boolean
          is_official: boolean
          is_stale: boolean | null
          last_commit_at: string | null
          name: string
          name_es: string | null
          platform: string
          readme_raw: string | null
          readme_summary: string | null
          review_count: number
          security_checked_at: string | null
          security_notes: string | null
          security_scan_result: Json | null
          security_scanned_at: string | null
          security_status: string
          slug: string
          source: string
          status: string
          trust_score: number | null
          updated_at: string
        }
        Insert: {
          approved_content_hash?: string | null
          avg_rating?: number
          category?: string
          created_at?: string
          creator_id?: string | null
          description?: string
          description_es?: string | null
          embedding?: string | null
          github_stars?: number
          github_url?: string | null
          homepage?: string | null
          icon_url?: string | null
          id?: string
          install_count?: number
          is_anthropic_verified?: boolean
          is_official?: boolean
          is_stale?: boolean | null
          last_commit_at?: string | null
          name: string
          name_es?: string | null
          platform?: string
          readme_raw?: string | null
          readme_summary?: string | null
          review_count?: number
          security_checked_at?: string | null
          security_notes?: string | null
          security_scan_result?: Json | null
          security_scanned_at?: string | null
          security_status?: string
          slug: string
          source?: string
          status?: string
          trust_score?: number | null
          updated_at?: string
        }
        Update: {
          approved_content_hash?: string | null
          avg_rating?: number
          category?: string
          created_at?: string
          creator_id?: string | null
          description?: string
          description_es?: string | null
          embedding?: string | null
          github_stars?: number
          github_url?: string | null
          homepage?: string | null
          icon_url?: string | null
          id?: string
          install_count?: number
          is_anthropic_verified?: boolean
          is_official?: boolean
          is_stale?: boolean | null
          last_commit_at?: string | null
          name?: string
          name_es?: string | null
          platform?: string
          readme_raw?: string | null
          readme_summary?: string | null
          review_count?: number
          security_checked_at?: string | null
          security_notes?: string | null
          security_scan_result?: Json | null
          security_scanned_at?: string | null
          security_status?: string
          slug?: string
          source?: string
          status?: string
          trust_score?: number | null
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
          is_verified_publisher: boolean | null
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
          is_verified_publisher?: boolean | null
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
          is_verified_publisher?: boolean | null
          role?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      quality_insights: {
        Row: {
          action_taken: string | null
          created_at: string
          details: Json
          goal: string
          id: string
          insight_type: string
          status: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          details?: Json
          goal: string
          id?: string
          insight_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          details?: Json
          goal?: string
          id?: string
          insight_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_feedback: {
        Row: {
          chosen_option: string | null
          comment: string | null
          created_at: string
          goal: string
          id: string
          matched_template_slug: string | null
          rating: number | null
          recommended_slugs: string[]
          user_ip: string | null
        }
        Insert: {
          chosen_option?: string | null
          comment?: string | null
          created_at?: string
          goal: string
          id?: string
          matched_template_slug?: string | null
          rating?: number | null
          recommended_slugs?: string[]
          user_ip?: string | null
        }
        Update: {
          chosen_option?: string | null
          comment?: string | null
          created_at?: string
          goal?: string
          id?: string
          matched_template_slug?: string | null
          rating?: number | null
          recommended_slugs?: string[]
          user_ip?: string | null
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
      security_advisories: {
        Row: {
          action_taken: string
          created_at: string
          description: string
          id: string
          incident_id: string | null
          is_public: boolean | null
          item_name: string
          item_slug: string
          item_type: string
          published_at: string | null
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          action_taken: string
          created_at?: string
          description: string
          id?: string
          incident_id?: string | null
          is_public?: boolean | null
          item_name: string
          item_slug: string
          item_type: string
          published_at?: string | null
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_taken?: string
          created_at?: string
          description?: string
          id?: string
          incident_id?: string | null
          is_public?: boolean | null
          item_name?: string
          item_slug?: string
          item_type?: string
          published_at?: string | null
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_advisories_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      security_incidents: {
        Row: {
          affected_users_count: number | null
          created_at: string
          description: string
          id: string
          item_id: string
          item_slug: string
          item_type: string
          notified_users: boolean | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          scan_result: Json | null
          severity: string
          status: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          affected_users_count?: number | null
          created_at?: string
          description: string
          id?: string
          item_id: string
          item_slug: string
          item_type: string
          notified_users?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_result?: Json | null
          severity?: string
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          affected_users_count?: number | null
          created_at?: string
          description?: string
          id?: string
          item_id?: string
          item_slug?: string
          item_type?: string
          notified_users?: boolean | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          scan_result?: Json | null
          severity?: string
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          item_id: string
          item_slug: string
          item_type: string
          report_type: string
          reporter_email: string | null
          reporter_user_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          item_id: string
          item_slug: string
          item_type: string
          report_type: string
          reporter_email?: string | null
          reporter_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          item_id?: string
          item_slug?: string
          item_type?: string
          report_type?: string
          reporter_email?: string | null
          reporter_user_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          auto_generated: boolean
          connector_slugs: string[]
          created_at: string | null
          description: string
          description_es: string | null
          hero_emoji: string | null
          id: string
          is_active: boolean | null
          last_regenerated_at: string | null
          plugin_slugs: string[]
          role_slug: string
          skill_slugs: string[]
          title: string
          title_es: string | null
          total_items: number
        }
        Insert: {
          auto_generated?: boolean
          connector_slugs?: string[]
          created_at?: string | null
          description: string
          description_es?: string | null
          hero_emoji?: string | null
          id?: string
          is_active?: boolean | null
          last_regenerated_at?: string | null
          plugin_slugs?: string[]
          role_slug: string
          skill_slugs?: string[]
          title: string
          title_es?: string | null
          total_items?: number
        }
        Update: {
          auto_generated?: boolean
          connector_slugs?: string[]
          created_at?: string | null
          description?: string
          description_es?: string | null
          hero_emoji?: string | null
          id?: string
          is_active?: boolean | null
          last_regenerated_at?: string | null
          plugin_slugs?: string[]
          role_slug?: string
          skill_slugs?: string[]
          title?: string
          title_es?: string | null
          total_items?: number
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
      skill_eval_runs: {
        Row: {
          avg_score: number
          created_at: string
          id: string
          iteration: number
          model_version: string | null
          pass_rate: number
          run_at: string
          skill_draft_id: string | null
          skill_md_snapshot: string | null
          skill_slug: string | null
          test_cases_json: Json
          token_usage: number | null
        }
        Insert: {
          avg_score?: number
          created_at?: string
          id?: string
          iteration?: number
          model_version?: string | null
          pass_rate?: number
          run_at?: string
          skill_draft_id?: string | null
          skill_md_snapshot?: string | null
          skill_slug?: string | null
          test_cases_json?: Json
          token_usage?: number | null
        }
        Update: {
          avg_score?: number
          created_at?: string
          id?: string
          iteration?: number
          model_version?: string | null
          pass_rate?: number
          run_at?: string
          skill_draft_id?: string | null
          skill_md_snapshot?: string | null
          skill_slug?: string | null
          test_cases_json?: Json
          token_usage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_eval_runs_skill_draft_id_fkey"
            columns: ["skill_draft_id"]
            isOneToOne: false
            referencedRelation: "skill_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          approved_content_hash: string | null
          auto_approved_reason: string | null
          avg_rating: number
          category: string
          changelog: string | null
          created_at: string
          creator_id: string | null
          description_human: string
          description_human_es: string | null
          display_name: string
          display_name_es: string | null
          embedding: string | null
          github_stars: number
          github_url: string | null
          id: string
          industry: string[]
          install_command: string
          install_count: number
          install_count_source: string
          install_count_verified: boolean
          is_public: boolean
          is_stale: boolean | null
          last_commit_at: string | null
          price_amount: number | null
          pricing_model: string
          quality_rank: number | null
          quality_score: number | null
          readme_raw: string | null
          readme_summary: string | null
          readme_summary_es: string | null
          required_mcps: Json | null
          review_count: number
          search_vector: unknown
          security_checked_at: string | null
          security_notes: string | null
          security_scan_result: Json | null
          security_scanned_at: string | null
          security_status: string
          share_token: string | null
          skill_md: string | null
          skill_md_status: string
          slug: string
          status: string
          tagline: string
          tagline_es: string | null
          target_roles: string[]
          time_to_install_minutes: number
          trust_score: number | null
          updated_at: string
          use_cases: Json
          version: string | null
          video_url: string | null
        }
        Insert: {
          approved_content_hash?: string | null
          auto_approved_reason?: string | null
          avg_rating?: number
          category?: string
          changelog?: string | null
          created_at?: string
          creator_id?: string | null
          description_human: string
          description_human_es?: string | null
          display_name: string
          display_name_es?: string | null
          embedding?: string | null
          github_stars?: number
          github_url?: string | null
          id?: string
          industry?: string[]
          install_command: string
          install_count?: number
          install_count_source?: string
          install_count_verified?: boolean
          is_public?: boolean
          is_stale?: boolean | null
          last_commit_at?: string | null
          price_amount?: number | null
          pricing_model?: string
          quality_rank?: number | null
          quality_score?: number | null
          readme_raw?: string | null
          readme_summary?: string | null
          readme_summary_es?: string | null
          required_mcps?: Json | null
          review_count?: number
          search_vector?: unknown
          security_checked_at?: string | null
          security_notes?: string | null
          security_scan_result?: Json | null
          security_scanned_at?: string | null
          security_status?: string
          share_token?: string | null
          skill_md?: string | null
          skill_md_status?: string
          slug: string
          status?: string
          tagline: string
          tagline_es?: string | null
          target_roles?: string[]
          time_to_install_minutes?: number
          trust_score?: number | null
          updated_at?: string
          use_cases?: Json
          version?: string | null
          video_url?: string | null
        }
        Update: {
          approved_content_hash?: string | null
          auto_approved_reason?: string | null
          avg_rating?: number
          category?: string
          changelog?: string | null
          created_at?: string
          creator_id?: string | null
          description_human?: string
          description_human_es?: string | null
          display_name?: string
          display_name_es?: string | null
          embedding?: string | null
          github_stars?: number
          github_url?: string | null
          id?: string
          industry?: string[]
          install_command?: string
          install_count?: number
          install_count_source?: string
          install_count_verified?: boolean
          is_public?: boolean
          is_stale?: boolean | null
          last_commit_at?: string | null
          price_amount?: number | null
          pricing_model?: string
          quality_rank?: number | null
          quality_score?: number | null
          readme_raw?: string | null
          readme_summary?: string | null
          readme_summary_es?: string | null
          required_mcps?: Json | null
          review_count?: number
          search_vector?: unknown
          security_checked_at?: string | null
          security_notes?: string | null
          security_scan_result?: Json | null
          security_scanned_at?: string | null
          security_status?: string
          share_token?: string | null
          skill_md?: string | null
          skill_md_status?: string
          slug?: string
          status?: string
          tagline?: string
          tagline_es?: string | null
          target_roles?: string[]
          time_to_install_minutes?: number
          trust_score?: number | null
          updated_at?: string
          use_cases?: Json
          version?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      skills_import_staging: {
        Row: {
          category: string | null
          created_at: string
          dedup_reason: string | null
          dedup_status: string
          description: string | null
          error_message: string | null
          id: string
          import_status: string
          imported_at: string | null
          install_command: string | null
          matched_existing_slug: string | null
          name: string
          repo_name: string | null
          repo_owner: string | null
          repo_url: string | null
          skill_folder: string | null
          source: string
          source_install_count: number | null
          source_slug: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          dedup_reason?: string | null
          dedup_status?: string
          description?: string | null
          error_message?: string | null
          id?: string
          import_status?: string
          imported_at?: string | null
          install_command?: string | null
          matched_existing_slug?: string | null
          name: string
          repo_name?: string | null
          repo_owner?: string | null
          repo_url?: string | null
          skill_folder?: string | null
          source?: string
          source_install_count?: number | null
          source_slug?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          dedup_reason?: string | null
          dedup_status?: string
          description?: string | null
          error_message?: string | null
          id?: string
          import_status?: string
          imported_at?: string | null
          install_command?: string | null
          matched_existing_slug?: string | null
          name?: string
          repo_name?: string | null
          repo_owner?: string | null
          repo_url?: string | null
          skill_folder?: string | null
          source?: string
          source_install_count?: number | null
          source_slug?: string | null
        }
        Relationships: []
      }
      slug_redirects: {
        Row: {
          created_at: string
          id: string
          item_type: string
          new_slug: string
          old_slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type?: string
          new_slug: string
          old_slug: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          new_slug?: string
          old_slug?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          completed_at: string | null
          duplicate_count: number | null
          duration_seconds: number | null
          error_count: number | null
          error_log: Json | null
          id: string
          imported_count: number | null
          new_count: number | null
          skipped_count: number | null
          source: string
          started_at: string
          status: string
          total_scraped: number | null
        }
        Insert: {
          completed_at?: string | null
          duplicate_count?: number | null
          duration_seconds?: number | null
          error_count?: number | null
          error_log?: Json | null
          id?: string
          imported_count?: number | null
          new_count?: number | null
          skipped_count?: number | null
          source?: string
          started_at?: string
          status?: string
          total_scraped?: number | null
        }
        Update: {
          completed_at?: string | null
          duplicate_count?: number | null
          duration_seconds?: number | null
          error_count?: number | null
          error_log?: Json | null
          id?: string
          imported_count?: number | null
          new_count?: number | null
          skipped_count?: number | null
          source?: string
          started_at?: string
          status?: string
          total_scraped?: number | null
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          item_slug: string | null
          item_type: string | null
          query_text: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          item_slug?: string | null
          item_type?: string | null
          query_text?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          item_slug?: string | null
          item_type?: string | null
          query_text?: string | null
          session_id?: string | null
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
      version_hashes: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          item_id: string
          item_slug: string
          item_type: string
          snapshot: Json | null
          tool_descriptions_hash: string | null
          version_tag: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          item_id: string
          item_slug: string
          item_type: string
          snapshot?: Json | null
          tool_descriptions_hash?: string | null
          version_tag?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          item_id?: string
          item_slug?: string
          item_type?: string
          snapshot?: Json | null
          tool_descriptions_hash?: string | null
          version_tag?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      directory_stats_mv: {
        Row: {
          categories_count: number | null
          connectors_count: number | null
          goal_templates_count: number | null
          plugins_count: number | null
          refreshed_at: string | null
          skills_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fetch_skill_by_share_token: {
        Args: { _slug: string; _token: string }
        Returns: {
          approved_content_hash: string | null
          auto_approved_reason: string | null
          avg_rating: number
          category: string
          changelog: string | null
          created_at: string
          creator_id: string | null
          description_human: string
          description_human_es: string | null
          display_name: string
          display_name_es: string | null
          embedding: string | null
          github_stars: number
          github_url: string | null
          id: string
          industry: string[]
          install_command: string
          install_count: number
          install_count_source: string
          install_count_verified: boolean
          is_public: boolean
          is_stale: boolean | null
          last_commit_at: string | null
          price_amount: number | null
          pricing_model: string
          quality_rank: number | null
          quality_score: number | null
          readme_raw: string | null
          readme_summary: string | null
          readme_summary_es: string | null
          required_mcps: Json | null
          review_count: number
          search_vector: unknown
          security_checked_at: string | null
          security_notes: string | null
          security_scan_result: Json | null
          security_scanned_at: string | null
          security_status: string
          share_token: string | null
          skill_md: string | null
          skill_md_status: string
          slug: string
          status: string
          tagline: string
          tagline_es: string | null
          target_roles: string[]
          time_to_install_minutes: number
          trust_score: number | null
          updated_at: string
          use_cases: Json
          version: string | null
          video_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "skills"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      find_truncated_blog_posts: {
        Args: { batch_limit?: number; min_len?: number }
        Returns: {
          category: string
          content: string
          content_es: string
          id: string
          keywords: string[]
          related_connector_slugs: string[]
          related_skill_slugs: string[]
          slug: string
          title: string
          title_es: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_quality_ranks: { Args: never; Returns: undefined }
      refresh_directory_stats: { Args: never; Returns: undefined }
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
      semantic_search_skills: {
        Args: {
          filter_category?: string
          filter_roles?: string[]
          match_count?: number
          query_embedding: string
          similarity_threshold?: number
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
          use_cases: Json
          video_url: string
        }[]
      }
      validate_api_key: { Args: { _key_hash: string }; Returns: string }
      validate_api_key_salted: { Args: { _plain_key: string }; Returns: string }
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
