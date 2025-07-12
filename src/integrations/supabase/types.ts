export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          is_active: boolean
          message: string
          title: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          title: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          skill_request_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          skill_request_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          skill_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_skill_request_id_fkey"
            columns: ["skill_request_id"]
            isOneToOne: false
            referencedRelation: "skill_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability:
            | Database["public"]["Enums"]["availability_type"][]
            | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          created_at: string
          full_name: string
          id: string
          is_banned: boolean
          is_public: boolean
          location: string | null
          successful_swaps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?:
            | Database["public"]["Enums"]["availability_type"][]
            | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_banned?: boolean
          is_public?: boolean
          location?: string | null
          successful_swaps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?:
            | Database["public"]["Enums"]["availability_type"][]
            | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_banned?: boolean
          is_public?: boolean
          location?: string | null
          successful_swaps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          rated_id: string
          rater_id: string
          rating: number
          request_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          rated_id: string
          rater_id: string
          rating: number
          request_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          rated_id?: string
          rater_id?: string
          rating?: number
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "skill_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          offered_skill_id: string
          provider_id: string
          requester_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          wanted_skill_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          offered_skill_id: string
          provider_id: string
          requester_id: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          wanted_skill_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          offered_skill_id?: string
          provider_id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          wanted_skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_requests_offered_skill_id_fkey"
            columns: ["offered_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_requests_wanted_skill_id_fkey"
            columns: ["wanted_skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"]
          created_at: string
          description: string | null
          id: string
          is_approved: boolean
          is_offering: boolean
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_approved?: boolean
          is_offering?: boolean
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["skill_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_approved?: boolean
          is_offering?: boolean
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      availability_type:
        | "weekdays"
        | "weekends"
        | "evenings"
        | "mornings"
        | "flexible"
      request_status:
        | "pending"
        | "accepted"
        | "completed"
        | "cancelled"
        | "rejected"
      skill_category:
        | "technology"
        | "language"
        | "music"
        | "art"
        | "cooking"
        | "sports"
        | "business"
        | "other"
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
      availability_type: [
        "weekdays",
        "weekends",
        "evenings",
        "mornings",
        "flexible",
      ],
      request_status: [
        "pending",
        "accepted",
        "completed",
        "cancelled",
        "rejected",
      ],
      skill_category: [
        "technology",
        "language",
        "music",
        "art",
        "cooking",
        "sports",
        "business",
        "other",
      ],
    },
  },
} as const
