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
      carbon_budgets: {
        Row: {
          created_at: string
          discount_rate: number | null
          id: string
          organization_id: string | null
          scope_1_carbon_cost: number | null
          scope_2_carbon_cost: number | null
          scope_3_carbon_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_rate?: number | null
          id?: string
          organization_id?: string | null
          scope_1_carbon_cost?: number | null
          scope_2_carbon_cost?: number | null
          scope_3_carbon_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount_rate?: number | null
          id?: string
          organization_id?: string | null
          scope_1_carbon_cost?: number | null
          scope_2_carbon_cost?: number | null
          scope_3_carbon_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carbon_budgets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          apportioned_emissions: number | null
          company_name: string
          country: string
          created_at: string
          id: string
          organization_id: string | null
          reporting_year: number
          revenue: number
          updated_at: string
          user_id: string
        }
        Insert: {
          apportioned_emissions?: number | null
          company_name: string
          country: string
          created_at?: string
          id?: string
          organization_id?: string | null
          reporting_year: number
          revenue?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          apportioned_emissions?: number | null
          company_name?: string
          country?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          reporting_year?: number
          revenue?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emissions_data: {
        Row: {
          cdp_score: string | null
          created_at: string
          ecovadis_score: number | null
          id: string
          organization_id: string | null
          reporting_year: number
          revenue: number | null
          sbti_target_status: string | null
          scope_1_emissions: number | null
          scope_2_emissions: number | null
          scope_2_location_based: number | null
          scope_3_emissions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cdp_score?: string | null
          created_at?: string
          ecovadis_score?: number | null
          id?: string
          organization_id?: string | null
          reporting_year: number
          revenue?: number | null
          sbti_target_status?: string | null
          scope_1_emissions?: number | null
          scope_2_emissions?: number | null
          scope_2_location_based?: number | null
          scope_3_emissions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cdp_score?: string | null
          created_at?: string
          ecovadis_score?: number | null
          id?: string
          organization_id?: string | null
          reporting_year?: number
          revenue?: number | null
          sbti_target_status?: string | null
          scope_1_emissions?: number | null
          scope_2_emissions?: number | null
          scope_2_location_based?: number | null
          scope_3_emissions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emissions_data_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_benchmarks: {
        Row: {
          avg_cdp_score: string | null
          avg_ecovadis_score: number | null
          avg_scope_1_intensity: number | null
          avg_scope_2_intensity: number | null
          avg_scope_3_intensity: number | null
          company_name: string
          created_at: string
          id: string
          industry: string
          is_leader: boolean | null
          sbti_adoption_rate: number | null
          year: number
        }
        Insert: {
          avg_cdp_score?: string | null
          avg_ecovadis_score?: number | null
          avg_scope_1_intensity?: number | null
          avg_scope_2_intensity?: number | null
          avg_scope_3_intensity?: number | null
          company_name: string
          created_at?: string
          id?: string
          industry: string
          is_leader?: boolean | null
          sbti_adoption_rate?: number | null
          year: number
        }
        Update: {
          avg_cdp_score?: string | null
          avg_ecovadis_score?: number | null
          avg_scope_1_intensity?: number | null
          avg_scope_2_intensity?: number | null
          avg_scope_3_intensity?: number | null
          company_name?: string
          created_at?: string
          id?: string
          industry?: string
          is_leader?: boolean | null
          sbti_adoption_rate?: number | null
          year?: number
        }
        Relationships: []
      }
      netzero_targets: {
        Row: {
          base_year: number
          created_at: string
          id: string
          near_term_target_year: number
          netzero_target_year: number
          organization_id: string | null
          scope_1_2_reduction_percent: number
          scope_3_reduction_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_year: number
          created_at?: string
          id?: string
          near_term_target_year: number
          netzero_target_year: number
          organization_id?: string | null
          scope_1_2_reduction_percent: number
          scope_3_reduction_percent: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_year?: number
          created_at?: string
          id?: string
          near_term_target_year?: number
          netzero_target_year?: number
          organization_id?: string | null
          scope_1_2_reduction_percent?: number
          scope_3_reduction_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "netzero_targets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          base_year: number | null
          company_size: string | null
          created_at: string
          currency: string
          id: string
          industry: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          base_year?: number | null
          company_size?: string | null
          created_at?: string
          currency?: string
          id?: string
          industry?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          base_year?: number | null
          company_size?: string | null
          created_at?: string
          currency?: string
          id?: string
          industry?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          banner_url: string | null
          base_year: number | null
          company_name: string
          company_size: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          industry: string | null
          logo_url: string | null
          organization_id: string | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          base_year?: number | null
          company_name: string
          company_size?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          organization_id?: string | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banner_url?: string | null
          base_year?: number | null
          company_name?: string
          company_size?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          organization_id?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sustainability_credentials: {
        Row: {
          attachment_url: string | null
          certificate_url: string | null
          created_at: string
          credential_name: string
          credential_type: string
          display_order: number | null
          id: string
          logo_url: string | null
          organization_id: string | null
          score_or_level: string | null
          status: string | null
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          attachment_url?: string | null
          certificate_url?: string | null
          created_at?: string
          credential_name: string
          credential_type: string
          display_order?: number | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          score_or_level?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          attachment_url?: string | null
          certificate_url?: string | null
          created_at?: string
          credential_name?: string
          credential_type?: string
          display_order?: number | null
          id?: string
          logo_url?: string | null
          organization_id?: string | null
          score_or_level?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sustainability_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      has_org_role: {
        Args: {
          _role: Database["public"]["Enums"]["org_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin_or_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      org_role: "owner" | "admin" | "member"
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
      app_role: ["admin", "user"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
