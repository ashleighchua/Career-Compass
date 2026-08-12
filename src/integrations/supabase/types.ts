export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      ai_analyses: {
        Row: {
          created_at: string;
          error: string | null;
          fingerprint: string;
          id: string;
          is_mock: boolean;
          latency_ms: number | null;
          provider: string;
          result: Json | null;
          service: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          error?: string | null;
          fingerprint: string;
          id?: string;
          is_mock?: boolean;
          latency_ms?: number | null;
          provider?: string;
          result?: Json | null;
          service: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          error?: string | null;
          fingerprint?: string;
          id?: string;
          is_mock?: boolean;
          latency_ms?: number | null;
          provider?: string;
          result?: Json | null;
          service?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      application_kits: {
        Row: {
          cover_letter: string | null;
          created_at: string;
          id: string;
          is_mock: boolean;
          positioning_summary: string;
          resume_bullets: Json;
          risks: Json;
          talking_points: Json;
          target_role_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cover_letter?: string | null;
          created_at?: string;
          id?: string;
          is_mock?: boolean;
          positioning_summary: string;
          resume_bullets?: Json;
          risks?: Json;
          talking_points?: Json;
          target_role_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cover_letter?: string | null;
          created_at?: string;
          id?: string;
          is_mock?: boolean;
          positioning_summary?: string;
          resume_bullets?: Json;
          risks?: Json;
          talking_points?: Json;
          target_role_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "application_kits_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "target_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence_contradictions: {
        Row: {
          created_at: string;
          detail: string | null;
          evidence_ids: string[];
          id: string;
          severity: string;
          status: string;
          summary: string;
          target_role_id: string | null;
          updated_at: string;
          user_id: string;
          user_note: string | null;
        };
        Insert: {
          created_at?: string;
          detail?: string | null;
          evidence_ids?: string[];
          id?: string;
          severity?: string;
          status?: string;
          summary: string;
          target_role_id?: string | null;
          updated_at?: string;
          user_id: string;
          user_note?: string | null;
        };
        Update: {
          created_at?: string;
          detail?: string | null;
          evidence_ids?: string[];
          id?: string;
          severity?: string;
          status?: string;
          summary?: string;
          target_role_id?: string | null;
          updated_at?: string;
          user_id?: string;
          user_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_contradictions_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "target_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence_items: {
        Row: {
          actions: string | null;
          analysis_status: string;
          claimed_skills: string[];
          context: string | null;
          created_at: string;
          description: string | null;
          experience_id: string | null;
          id: string;
          metrics: string | null;
          occurred_on: string | null;
          organisation: string | null;
          outcome: string | null;
          source: string | null;
          source_type: string;
          title: string;
          updated_at: string;
          user_id: string;
          user_role: string | null;
          verification_type: string;
        };
        Insert: {
          actions?: string | null;
          analysis_status?: string;
          claimed_skills?: string[];
          context?: string | null;
          created_at?: string;
          description?: string | null;
          experience_id?: string | null;
          id?: string;
          metrics?: string | null;
          occurred_on?: string | null;
          organisation?: string | null;
          outcome?: string | null;
          source?: string | null;
          source_type?: string;
          title: string;
          updated_at?: string;
          user_id: string;
          user_role?: string | null;
          verification_type?: string;
        };
        Update: {
          actions?: string | null;
          analysis_status?: string;
          claimed_skills?: string[];
          context?: string | null;
          created_at?: string;
          description?: string | null;
          experience_id?: string | null;
          id?: string;
          metrics?: string | null;
          occurred_on?: string | null;
          organisation?: string | null;
          outcome?: string | null;
          source?: string | null;
          source_type?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          user_role?: string | null;
          verification_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_items_experience_id_fkey";
            columns: ["experience_id"];
            isOneToOne: false;
            referencedRelation: "experiences";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence_skills: {
        Row: {
          confidence: string;
          created_at: string;
          evidence_id: string;
          id: string;
          overridden_at: string | null;
          reasoning: string | null;
          relationship_type: string;
          skill_id: string;
          source: string;
          strength: number;
          updated_at: string;
          user_decision: string | null;
          user_id: string;
          user_note: string | null;
        };
        Insert: {
          confidence?: string;
          created_at?: string;
          evidence_id: string;
          id?: string;
          overridden_at?: string | null;
          reasoning?: string | null;
          relationship_type?: string;
          skill_id: string;
          source?: string;
          strength?: number;
          updated_at?: string;
          user_decision?: string | null;
          user_id: string;
          user_note?: string | null;
        };
        Update: {
          confidence?: string;
          created_at?: string;
          evidence_id?: string;
          id?: string;
          overridden_at?: string | null;
          reasoning?: string | null;
          relationship_type?: string;
          skill_id?: string;
          source?: string;
          strength?: number;
          updated_at?: string;
          user_decision?: string | null;
          user_id?: string;
          user_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_skills_evidence_id_fkey";
            columns: ["evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_skills_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
        ];
      };
      experiences: {
        Row: {
          created_at: string;
          description: string | null;
          end_date: string | null;
          id: string;
          industry: string | null;
          organisation: string | null;
          seniority: string | null;
          start_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          industry?: string | null;
          organisation?: string | null;
          seniority?: string | null;
          start_date?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          industry?: string | null;
          organisation?: string | null;
          seniority?: string | null;
          start_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      interview_questions: {
        Row: {
          answer_feedback: Json | null;
          answered_at: string | null;
          created_at: string;
          difficulty: string;
          evidence_ids: string[];
          id: string;
          question: string;
          question_type: string;
          requirement_id: string | null;
          risk_note: string | null;
          suggested_structure: string | null;
          target_role_id: string;
          updated_at: string;
          user_answer: string | null;
          user_id: string;
          why_asked: string | null;
        };
        Insert: {
          answer_feedback?: Json | null;
          answered_at?: string | null;
          created_at?: string;
          difficulty?: string;
          evidence_ids?: string[];
          id?: string;
          question: string;
          question_type?: string;
          requirement_id?: string | null;
          risk_note?: string | null;
          suggested_structure?: string | null;
          target_role_id: string;
          updated_at?: string;
          user_answer?: string | null;
          user_id: string;
          why_asked?: string | null;
        };
        Update: {
          answer_feedback?: Json | null;
          answered_at?: string | null;
          created_at?: string;
          difficulty?: string;
          evidence_ids?: string[];
          id?: string;
          question?: string;
          question_type?: string;
          requirement_id?: string | null;
          risk_note?: string | null;
          suggested_structure?: string | null;
          target_role_id?: string;
          updated_at?: string;
          user_answer?: string | null;
          user_id?: string;
          why_asked?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "interview_questions_requirement_id_fkey";
            columns: ["requirement_id"];
            isOneToOne: false;
            referencedRelation: "job_requirements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interview_questions_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "target_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_requirements: {
        Row: {
          canonical_skill: string;
          created_at: string;
          id: string;
          importance: string;
          original_wording: string | null;
          reasoning: string | null;
          requirement_type: string;
          seniority_level: string | null;
          skill_id: string | null;
          target_role_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          canonical_skill: string;
          created_at?: string;
          id?: string;
          importance?: string;
          original_wording?: string | null;
          reasoning?: string | null;
          requirement_type?: string;
          seniority_level?: string | null;
          skill_id?: string | null;
          target_role_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          canonical_skill?: string;
          created_at?: string;
          id?: string;
          importance?: string;
          original_wording?: string | null;
          reasoning?: string | null;
          requirement_type?: string;
          seniority_level?: string | null;
          skill_id?: string | null;
          target_role_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_requirements_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_requirements_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "target_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          headline: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          headline?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          headline?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      recommended_actions: {
        Row: {
          action: string;
          classification: string;
          completed_evidence_id: string | null;
          created_at: string;
          current_evidence: string | null;
          deliverable: string | null;
          effort: string | null;
          evidence_value: string | null;
          gap_label: string;
          id: string;
          priority: number;
          proves: string[];
          requirement_ids: string[];
          status: string;
          target_role_id: string;
          updated_at: string;
          user_id: string;
          why_it_matters: string | null;
        };
        Insert: {
          action: string;
          classification?: string;
          completed_evidence_id?: string | null;
          created_at?: string;
          current_evidence?: string | null;
          deliverable?: string | null;
          effort?: string | null;
          evidence_value?: string | null;
          gap_label: string;
          id?: string;
          priority?: number;
          proves?: string[];
          requirement_ids?: string[];
          status?: string;
          target_role_id: string;
          updated_at?: string;
          user_id: string;
          why_it_matters?: string | null;
        };
        Update: {
          action?: string;
          classification?: string;
          completed_evidence_id?: string | null;
          created_at?: string;
          current_evidence?: string | null;
          deliverable?: string | null;
          effort?: string | null;
          evidence_value?: string | null;
          gap_label?: string;
          id?: string;
          priority?: number;
          proves?: string[];
          requirement_ids?: string[];
          status?: string;
          target_role_id?: string;
          updated_at?: string;
          user_id?: string;
          why_it_matters?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "recommended_actions_completed_evidence_id_fkey";
            columns: ["completed_evidence_id"];
            isOneToOne: false;
            referencedRelation: "evidence_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommended_actions_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "target_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      skill_assessments: {
        Row: {
          autonomy_note: string | null;
          confidence: string;
          created_at: string;
          experience_note: string | null;
          id: string;
          missing_evidence: string | null;
          next_step: string | null;
          overridden_at: string | null;
          reasoning: string | null;
          recency_note: string | null;
          requirement_id: string;
          scope_note: string | null;
          seniority_note: string | null;
          status: string;
          strength: number;
          supporting_evidence_ids: string[];
          target_role_id: string;
          updated_at: string;
          user_id: string;
          user_note: string | null;
          user_reasoning: string | null;
          user_status: string | null;
        };
        Insert: {
          autonomy_note?: string | null;
          confidence?: string;
          created_at?: string;
          experience_note?: string | null;
          id?: string;
          missing_evidence?: string | null;
          next_step?: string | null;
          overridden_at?: string | null;
          reasoning?: string | null;
          recency_note?: string | null;
          requirement_id: string;
          scope_note?: string | null;
          seniority_note?: string | null;
          status?: string;
          strength?: number;
          supporting_evidence_ids?: string[];
          target_role_id: string;
          updated_at?: string;
          user_id: string;
          user_note?: string | null;
          user_reasoning?: string | null;
          user_status?: string | null;
        };
        Update: {
          autonomy_note?: string | null;
          confidence?: string;
          created_at?: string;
          experience_note?: string | null;
          id?: string;
          missing_evidence?: string | null;
          next_step?: string | null;
          overridden_at?: string | null;
          reasoning?: string | null;
          recency_note?: string | null;
          requirement_id?: string;
          scope_note?: string | null;
          seniority_note?: string | null;
          status?: string;
          strength?: number;
          supporting_evidence_ids?: string[];
          target_role_id?: string;
          updated_at?: string;
          user_id?: string;
          user_note?: string | null;
          user_reasoning?: string | null;
          user_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "skill_assessments_requirement_id_fkey";
            columns: ["requirement_id"];
            isOneToOne: true;
            referencedRelation: "job_requirements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "skill_assessments_target_role_id_fkey";
            columns: ["target_role_id"];
            isOneToOne: false;
            referencedRelation: "target_roles";
            referencedColumns: ["id"];
          },
        ];
      };
      skills: {
        Row: {
          aliases: string[];
          canonical_name: string;
          category: string | null;
          created_at: string;
          description: string | null;
          id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          aliases?: string[];
          canonical_name: string;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          aliases?: string[];
          canonical_name?: string;
          category?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      target_roles: {
        Row: {
          analysed_at: string | null;
          analysis_status: string;
          assessment_status: string;
          company: string | null;
          coverage: number | null;
          created_at: string;
          id: string;
          is_active: boolean;
          job_description: string | null;
          seniority: string | null;
          source_url: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          analysed_at?: string | null;
          analysis_status?: string;
          assessment_status?: string;
          company?: string | null;
          coverage?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          job_description?: string | null;
          seniority?: string | null;
          source_url?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          analysed_at?: string | null;
          analysis_status?: string;
          assessment_status?: string;
          company?: string | null;
          coverage?: number | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          job_description?: string | null;
          seniority?: string | null;
          source_url?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
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
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
