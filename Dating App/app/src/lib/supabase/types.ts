export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: number
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: never
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: never
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      admins: {
        Row: {
          added_at: string
          added_by: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      consent_events: {
        Row: {
          action: Database["public"]["Enums"]["consent_action"]
          id: number
          kind: Database["public"]["Enums"]["consent_kind"]
          occurred_at: string
          profile_id: string
          version: string
        }
        Insert: {
          action: Database["public"]["Enums"]["consent_action"]
          id?: never
          kind: Database["public"]["Enums"]["consent_kind"]
          occurred_at?: string
          profile_id: string
          version: string
        }
        Update: {
          action?: Database["public"]["Enums"]["consent_action"]
          id?: never
          kind?: Database["public"]["Enums"]["consent_kind"]
          occurred_at?: string
          profile_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      heritage_preferences: {
        Row: {
          accept_keys: string[]
          field: Database["public"]["Enums"]["heritage_field"]
          mode: Database["public"]["Enums"]["pref_mode"]
          profile_id: string
        }
        Insert: {
          accept_keys?: string[]
          field: Database["public"]["Enums"]["heritage_field"]
          mode: Database["public"]["Enums"]["pref_mode"]
          profile_id: string
        }
        Update: {
          accept_keys?: string[]
          field?: Database["public"]["Enums"]["heritage_field"]
          mode?: Database["public"]["Enums"]["pref_mode"]
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "heritage_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          height: number | null
          id: string
          position: number
          profile_id: string
          storage_path: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          position: number
          profile_id: string
          storage_path: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          position?: number
          profile_id?: string
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          drinking_accept: Database["public"]["Enums"]["habit"][]
          drinking_must: boolean
          faith_key_accept: string[]
          faith_key_must: boolean
          genotype_accept: Database["public"]["Enums"]["genotype"][]
          genotype_must: boolean
          height_pref_max_cm: number | null
          height_pref_min_cm: number | null
          height_pref_mode: Database["public"]["Enums"]["height_pref"]
          height_pref_must: boolean
          kids_accept: Database["public"]["Enums"]["kids"][]
          kids_must: boolean
          politics_accept: Database["public"]["Enums"]["politics"][]
          politics_must: boolean
          practice_accept: Database["public"]["Enums"]["practice"][]
          practice_must: boolean
          profile_id: string
          smoking_accept: Database["public"]["Enums"]["habit"][]
          smoking_must: boolean
          use_heritage: boolean
        }
        Insert: {
          drinking_accept?: Database["public"]["Enums"]["habit"][]
          drinking_must?: boolean
          faith_key_accept?: string[]
          faith_key_must?: boolean
          genotype_accept?: Database["public"]["Enums"]["genotype"][]
          genotype_must?: boolean
          height_pref_max_cm?: number | null
          height_pref_min_cm?: number | null
          height_pref_mode?: Database["public"]["Enums"]["height_pref"]
          height_pref_must?: boolean
          kids_accept?: Database["public"]["Enums"]["kids"][]
          kids_must?: boolean
          politics_accept?: Database["public"]["Enums"]["politics"][]
          politics_must?: boolean
          practice_accept?: Database["public"]["Enums"]["practice"][]
          practice_must?: boolean
          profile_id: string
          smoking_accept?: Database["public"]["Enums"]["habit"][]
          smoking_must?: boolean
          use_heritage?: boolean
        }
        Update: {
          drinking_accept?: Database["public"]["Enums"]["habit"][]
          drinking_must?: boolean
          faith_key_accept?: string[]
          faith_key_must?: boolean
          genotype_accept?: Database["public"]["Enums"]["genotype"][]
          genotype_must?: boolean
          height_pref_max_cm?: number | null
          height_pref_min_cm?: number | null
          height_pref_mode?: Database["public"]["Enums"]["height_pref"]
          height_pref_must?: boolean
          kids_accept?: Database["public"]["Enums"]["kids"][]
          kids_must?: boolean
          politics_accept?: Database["public"]["Enums"]["politics"][]
          politics_must?: boolean
          practice_accept?: Database["public"]["Enums"]["practice"][]
          practice_must?: boolean
          profile_id?: string
          smoking_accept?: Database["public"]["Enums"]["habit"][]
          smoking_must?: boolean
          use_heritage?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_answers: {
        Row: {
          drinking: Database["public"]["Enums"]["habit"] | null
          faith_key: string | null
          faith_label: string | null
          faith_practice: Database["public"]["Enums"]["practice"] | null
          genotype: Database["public"]["Enums"]["genotype"] | null
          goal: Database["public"]["Enums"]["goal"] | null
          health_section_enabled: boolean
          income_band: Database["public"]["Enums"]["income_band"] | null
          kids: Database["public"]["Enums"]["kids"] | null
          politics: Database["public"]["Enums"]["politics"] | null
          profile_id: string
          relocate: Database["public"]["Enums"]["relocate"] | null
          smoking: Database["public"]["Enums"]["habit"] | null
          timeline: Database["public"]["Enums"]["timeline"] | null
        }
        Insert: {
          drinking?: Database["public"]["Enums"]["habit"] | null
          faith_key?: string | null
          faith_label?: string | null
          faith_practice?: Database["public"]["Enums"]["practice"] | null
          genotype?: Database["public"]["Enums"]["genotype"] | null
          goal?: Database["public"]["Enums"]["goal"] | null
          health_section_enabled?: boolean
          income_band?: Database["public"]["Enums"]["income_band"] | null
          kids?: Database["public"]["Enums"]["kids"] | null
          politics?: Database["public"]["Enums"]["politics"] | null
          profile_id: string
          relocate?: Database["public"]["Enums"]["relocate"] | null
          smoking?: Database["public"]["Enums"]["habit"] | null
          timeline?: Database["public"]["Enums"]["timeline"] | null
        }
        Update: {
          drinking?: Database["public"]["Enums"]["habit"] | null
          faith_key?: string | null
          faith_label?: string | null
          faith_practice?: Database["public"]["Enums"]["practice"] | null
          genotype?: Database["public"]["Enums"]["genotype"] | null
          goal?: Database["public"]["Enums"]["goal"] | null
          health_section_enabled?: boolean
          income_band?: Database["public"]["Enums"]["income_band"] | null
          kids?: Database["public"]["Enums"]["kids"] | null
          politics?: Database["public"]["Enums"]["politics"] | null
          profile_id?: string
          relocate?: Database["public"]["Enums"]["relocate"] | null
          smoking?: Database["public"]["Enums"]["habit"] | null
          timeline?: Database["public"]["Enums"]["timeline"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_answers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_heritage: {
        Row: {
          field: Database["public"]["Enums"]["heritage_field"]
          profile_id: string
          value: string
          value_key: string
        }
        Insert: {
          field: Database["public"]["Enums"]["heritage_field"]
          profile_id: string
          value: string
          value_key: string
        }
        Update: {
          field?: Database["public"]["Enums"]["heritage_field"]
          profile_id?: string
          value?: string
          value_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_heritage_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          age_max: number
          age_min: number
          birth_date: string
          email_notifications: boolean
          lat_coarse: number | null
          lon_coarse: number | null
          max_distance_km: number
          profile_id: string
          review_flags: Json
        }
        Insert: {
          age_max?: number
          age_min?: number
          birth_date: string
          email_notifications?: boolean
          lat_coarse?: number | null
          lon_coarse?: number | null
          max_distance_km?: number
          profile_id: string
          review_flags?: Json
        }
        Update: {
          age_max?: number
          age_min?: number
          birth_date?: string
          email_notifications?: boolean
          lat_coarse?: number | null
          lon_coarse?: number | null
          max_distance_km?: number
          profile_id?: string
          review_flags?: Json
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_sensitive: {
        Row: {
          profile_id: string
          seeking: Database["public"]["Enums"]["seeking"] | null
        }
        Insert: {
          profile_id: string
          seeking?: Database["public"]["Enums"]["seeking"] | null
        }
        Update: {
          profile_id?: string
          seeking?: Database["public"]["Enums"]["seeking"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_sensitive_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          capacity: number
          city_label: string | null
          created_at: string
          education: Database["public"]["Enums"]["education"] | null
          first_name: string | null
          focus_now: boolean
          gender: Database["public"]["Enums"]["gender"] | null
          gender_label: string | null
          height_cm: number | null
          id: string
          last_active_at: string
          occupation: string | null
          paused_at: string | null
          prompts: Json | null
          show_heritage: boolean
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          age?: number | null
          capacity?: number
          city_label?: string | null
          created_at?: string
          education?: Database["public"]["Enums"]["education"] | null
          first_name?: string | null
          focus_now?: boolean
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_label?: string | null
          height_cm?: number | null
          id: string
          last_active_at?: string
          occupation?: string | null
          paused_at?: string | null
          prompts?: Json | null
          show_heritage?: boolean
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          age?: number | null
          capacity?: number
          city_label?: string | null
          created_at?: string
          education?: Database["public"]["Enums"]["education"] | null
          first_name?: string | null
          focus_now?: boolean
          gender?: Database["public"]["Enums"]["gender"] | null
          gender_label?: string | null
          height_cm?: number | null
          id?: string
          last_active_at?: string
          occupation?: string | null
          paused_at?: string | null
          prompts?: Json | null
          show_heritage?: boolean
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      upload_tickets: {
        Row: {
          claimed_at: string | null
          created_at: string
          expires_at: string
          id: string
          kind: Database["public"]["Enums"]["upload_kind"]
          object_path: string
          position: number | null
          poster_object_path: string | null
          used_at: string | null
          user_id: string
          verification_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind: Database["public"]["Enums"]["upload_kind"]
          object_path: string
          position?: number | null
          poster_object_path?: string | null
          used_at?: string | null
          user_id: string
          verification_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["upload_kind"]
          object_path?: string
          position?: number | null
          poster_object_path?: string | null
          used_at?: string | null
          user_id?: string
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upload_tickets_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily: {
        Row: {
          day: string
          feed_served: number
          messages_sent: number
          photo_uploads: number
          reports_filed: number
          user_id: string
          verification_submissions: number
          waiting_responses: number
        }
        Insert: {
          day?: string
          feed_served?: number
          messages_sent?: number
          photo_uploads?: number
          reports_filed?: number
          user_id: string
          verification_submissions?: number
          waiting_responses?: number
        }
        Update: {
          day?: string
          feed_served?: number
          messages_sent?: number
          photo_uploads?: number
          reports_filed?: number
          user_id?: string
          verification_submissions?: number
          waiting_responses?: number
        }
        Relationships: []
      }
      verifications: {
        Row: {
          decided_at: string | null
          decision: Database["public"]["Enums"]["verification_decision"] | null
          id: string
          note: string | null
          pose_code: string
          profile_id: string
          reviewer_id: string | null
          selfie_path: string | null
          submitted_at: string
        }
        Insert: {
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["verification_decision"] | null
          id?: string
          note?: string | null
          pose_code: string
          profile_id: string
          reviewer_id?: string | null
          selfie_path?: string | null
          submitted_at?: string
        }
        Update: {
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["verification_decision"] | null
          id?: string
          note?: string | null
          pose_code?: string
          profile_id?: string
          reviewer_id?: string | null
          selfie_path?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verifications_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["user_id"]
          },
        ]
      }
      video_prompts: {
        Row: {
          created_at: string
          duration_ms: number | null
          poster_height: number | null
          poster_path: string
          poster_width: number | null
          profile_id: string
          prompt_text: string
          video_path: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          poster_height?: number | null
          poster_path: string
          poster_width?: number | null
          profile_id: string
          prompt_text: string
          video_path: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          poster_height?: number | null
          poster_path?: string
          poster_width?: number | null
          profile_id?: string
          prompt_text?: string
          video_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_prompts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_review_verification: {
        Args: {
          p_decision: Database["public"]["Enums"]["verification_decision"]
          p_note?: string
          p_verification_id: string
        }
        Returns: undefined
      }
      am_i_admin: { Args: never; Returns: boolean }
      am_i_admin_identity: { Args: never; Returns: boolean }
      attempt_set_birth_date: { Args: { p_birth_date: string }; Returns: Json }
      begin_upload: { Args: { ticket_id: string }; Returns: Json }
      clear_verification_selfie_path: {
        Args: { p_verification_id: string }
        Returns: undefined
      }
      create_upload_ticket: {
        Args: {
          kind: Database["public"]["Enums"]["upload_kind"]
          p_position?: number
          verification_id?: string
        }
        Returns: Json
      }
      list_stale_incoming_objects: {
        Args: { p_limit?: number; p_older_than?: string }
        Returns: {
          bucket_id: string
          object_name: string
        }[]
      }
      list_stale_verification_selfies: {
        Args: { p_limit?: number; p_older_than?: string }
        Returns: {
          object_name: string
          verification_id: string
        }[]
      }
      process_upload: {
        Args: { height?: number; ticket_id: string; width?: number }
        Returns: Json
      }
      process_video_prompt_upload: {
        Args: {
          duration_ms?: number
          poster_height?: number
          poster_width?: number
          prompt_text?: string
          ticket_id: string
          video_format?: string
        }
        Returns: Json
      }
      record_consent: {
        Args: {
          action: Database["public"]["Enums"]["consent_action"]
          kind: Database["public"]["Enums"]["consent_kind"]
          version: string
        }
        Returns: undefined
      }
      start_verification: { Args: never; Returns: Json }
      submit_for_review: { Args: never; Returns: undefined }
    }
    Enums: {
      consent_action: "accepted" | "withdrawn"
      consent_kind: "terms" | "privacy" | "sensitive_data" | "genotype_data"
      education:
        | "high_school"
        | "some_college"
        | "bachelors"
        | "masters"
        | "doctorate"
        | "trade"
        | "other"
      gender: "woman" | "man" | "nonbinary" | "self_described"
      genotype: "AA" | "AS" | "SS" | "AC" | "SC" | "unknown"
      goal: "marriage" | "life_partner" | "serious_relationship"
      habit: "never" | "sometimes" | "regularly"
      height_pref: "doesnt_matter" | "taller" | "around" | "shorter" | "range"
      heritage_field:
        | "background"
        | "community"
        | "origin_country"
        | "origin_region"
        | "language"
        | "raised_in"
      income_band:
        | "under_40k"
        | "b40_80k"
        | "b80_150k"
        | "b150_300k"
        | "over_300k"
      kids: "want" | "dont_want" | "open" | "have_want_more" | "have_done"
      politics: "liberal" | "moderate" | "conservative" | "other" | "prefer_not"
      practice: "devout" | "practicing" | "cultural" | "not_practicing"
      pref_mode: "nice_to_have" | "important" | "must"
      profile_status:
        | "onboarding"
        | "pending_review"
        | "active"
        | "paused"
        | "restricted"
        | "banned"
        | "deleted"
      relocate: "yes" | "no" | "maybe"
      seeking: "women" | "men" | "everyone"
      timeline: "ready_now" | "within_year" | "exploring"
      upload_kind: "photo" | "selfie" | "video_prompt"
      verification_decision: "approved" | "rejected"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      consent_action: ["accepted", "withdrawn"],
      consent_kind: ["terms", "privacy", "sensitive_data", "genotype_data"],
      education: [
        "high_school",
        "some_college",
        "bachelors",
        "masters",
        "doctorate",
        "trade",
        "other",
      ],
      gender: ["woman", "man", "nonbinary", "self_described"],
      genotype: ["AA", "AS", "SS", "AC", "SC", "unknown"],
      goal: ["marriage", "life_partner", "serious_relationship"],
      habit: ["never", "sometimes", "regularly"],
      height_pref: ["doesnt_matter", "taller", "around", "shorter", "range"],
      heritage_field: [
        "background",
        "community",
        "origin_country",
        "origin_region",
        "language",
        "raised_in",
      ],
      income_band: [
        "under_40k",
        "b40_80k",
        "b80_150k",
        "b150_300k",
        "over_300k",
      ],
      kids: ["want", "dont_want", "open", "have_want_more", "have_done"],
      politics: ["liberal", "moderate", "conservative", "other", "prefer_not"],
      practice: ["devout", "practicing", "cultural", "not_practicing"],
      pref_mode: ["nice_to_have", "important", "must"],
      profile_status: [
        "onboarding",
        "pending_review",
        "active",
        "paused",
        "restricted",
        "banned",
        "deleted",
      ],
      relocate: ["yes", "no", "maybe"],
      seeking: ["women", "men", "everyone"],
      timeline: ["ready_now", "within_year", "exploring"],
      upload_kind: ["photo", "selfie", "video_prompt"],
      verification_decision: ["approved", "rejected"],
    },
  },
} as const

