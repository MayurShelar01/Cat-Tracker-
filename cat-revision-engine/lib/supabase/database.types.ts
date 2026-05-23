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
      daily_queue: {
        Row: {
          date: string
          id: string
          items: Json | null
          load_score: number | null
          rebalanced: boolean | null
          user_id: string | null
        }
        Insert: {
          date: string
          id?: string
          items?: Json | null
          load_score?: number | null
          rebalanced?: boolean | null
          user_id?: string | null
        }
        Update: {
          date?: string
          id?: string
          items?: Json | null
          load_score?: number | null
          rebalanced?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_topic_perf: {
        Row: {
          accuracy_pct: number | null
          id: string
          mock_id: string | null
          mock_name: string | null
          taken_at: string | null
          topic_id: string | null
        }
        Insert: {
          accuracy_pct?: number | null
          id?: string
          mock_id?: string | null
          mock_name?: string | null
          taken_at?: string | null
          topic_id?: string | null
        }
        Update: {
          accuracy_pct?: number | null
          id?: string
          mock_id?: string | null
          mock_name?: string | null
          taken_at?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mock_topic_perf_mock_id_fkey"
            columns: ["mock_id"]
            isOneToOne: false
            referencedRelation: "mocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mock_topic_perf_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      mocks: {
        Row: {
          id: string
          locked: boolean | null
          lrdi_percentile: number | null
          lrdi_score: number | null
          mock_name: string | null
          notes: string | null
          overall_percentile: number | null
          quant_percentile: number | null
          quant_score: number | null
          taken_at: string
          total_score: number | null
          user_id: string | null
          varc_percentile: number | null
          varc_score: number | null
        }
        Insert: {
          id?: string
          locked?: boolean | null
          lrdi_percentile?: number | null
          lrdi_score?: number | null
          mock_name?: string | null
          notes?: string | null
          overall_percentile?: number | null
          quant_percentile?: number | null
          quant_score?: number | null
          taken_at: string
          total_score?: number | null
          user_id?: string | null
          varc_percentile?: number | null
          varc_score?: number | null
        }
        Update: {
          id?: string
          locked?: boolean | null
          lrdi_percentile?: number | null
          lrdi_score?: number | null
          mock_name?: string | null
          notes?: string | null
          overall_percentile?: number | null
          quant_percentile?: number | null
          quant_score?: number | null
          taken_at?: string
          total_score?: number | null
          user_id?: string | null
          varc_percentile?: number | null
          varc_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          accuracy_pct: number
          attempted_at: string
          correct: number
          id: string
          round: number
          time_taken: number | null
          topic_id: string | null
          total_questions: number
          user_id: string | null
        }
        Insert: {
          accuracy_pct: number
          attempted_at: string
          correct: number
          id?: string
          round: number
          time_taken?: number | null
          topic_id?: string | null
          total_questions: number
          user_id?: string | null
        }
        Update: {
          accuracy_pct?: number
          attempted_at?: string
          correct?: number
          id?: string
          round?: number
          time_taken?: number | null
          topic_id?: string | null
          total_questions?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          day_number: number
          id: string
          order_index: number
          section: Database["public"]["Enums"]["section_enum"]
          topic_name: string
        }
        Insert: {
          day_number: number
          id?: string
          order_index: number
          section: Database["public"]["Enums"]["section_enum"]
          topic_name: string
        }
        Update: {
          day_number?: number
          id?: string
          order_index?: number
          section?: Database["public"]["Enums"]["section_enum"]
          topic_name?: string
        }
        Relationships: []
      }
      user_topics: {
        Row: {
          catchup_tag: Database["public"]["Enums"]["catchup_tag_enum"] | null
          extra_r2_inserted: boolean | null
          id: string
          mock_flagged: boolean | null
          r1_completed_at: string | null
          r1_confidence: Database["public"]["Enums"]["confidence_enum"] | null
          r1_status: Database["public"]["Enums"]["r1_status_enum"] | null
          r2_completed_at: string | null
          r2_confidence: Database["public"]["Enums"]["confidence_enum"] | null
          r2_due_at: string | null
          r3_completed_at: string | null
          r3_confidence: Database["public"]["Enums"]["confidence_enum"] | null
          r3_due_at: string | null
          skip_count: number | null
          topic_id: string | null
          user_id: string | null
        }
        Insert: {
          catchup_tag?: Database["public"]["Enums"]["catchup_tag_enum"] | null
          extra_r2_inserted?: boolean | null
          id?: string
          mock_flagged?: boolean | null
          r1_completed_at?: string | null
          r1_confidence?: Database["public"]["Enums"]["confidence_enum"] | null
          r1_status?: Database["public"]["Enums"]["r1_status_enum"] | null
          r2_completed_at?: string | null
          r2_confidence?: Database["public"]["Enums"]["confidence_enum"] | null
          r2_due_at?: string | null
          r3_completed_at?: string | null
          r3_confidence?: Database["public"]["Enums"]["confidence_enum"] | null
          r3_due_at?: string | null
          skip_count?: number | null
          topic_id?: string | null
          user_id?: string | null
        }
        Update: {
          catchup_tag?: Database["public"]["Enums"]["catchup_tag_enum"] | null
          extra_r2_inserted?: boolean | null
          id?: string
          mock_flagged?: boolean | null
          r1_completed_at?: string | null
          r1_confidence?: Database["public"]["Enums"]["confidence_enum"] | null
          r1_status?: Database["public"]["Enums"]["r1_status_enum"] | null
          r2_completed_at?: string | null
          r2_confidence?: Database["public"]["Enums"]["confidence_enum"] | null
          r2_due_at?: string | null
          r3_completed_at?: string | null
          r3_confidence?: Database["public"]["Enums"]["confidence_enum"] | null
          r3_due_at?: string | null
          skip_count?: number | null
          topic_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_topics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          catchup_mode: boolean | null
          created_at: string | null
          current_day: number | null
          email: string
          id: string
          lrdi_percentile: number | null
          quant_percentile: number | null
          varc_percentile: number | null
        }
        Insert: {
          catchup_mode?: boolean | null
          created_at?: string | null
          current_day?: number | null
          email: string
          id: string
          lrdi_percentile?: number | null
          quant_percentile?: number | null
          varc_percentile?: number | null
        }
        Update: {
          catchup_mode?: boolean | null
          created_at?: string | null
          current_day?: number | null
          email?: string
          id?: string
          lrdi_percentile?: number | null
          quant_percentile?: number | null
          varc_percentile?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      catchup_tag_enum: "never_touched" | "vaguely_remember" | "studied_before"
      confidence_enum: "shaky" | "okay" | "solid"
      r1_status_enum: "not_started" | "skimmed" | "done"
      section_enum: "VARC" | "QUANT" | "LRDI" | "VARC_QUANT"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      catchup_tag_enum: ["never_touched", "vaguely_remember", "studied_before"],
      confidence_enum: ["shaky", "okay", "solid"],
      r1_status_enum: ["not_started", "skimmed", "done"],
      section_enum: ["VARC", "QUANT", "LRDI", "VARC_QUANT"],
    },
  },
} as const
