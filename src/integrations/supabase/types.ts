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
      care_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          patient_id: string
          read_by_patient: boolean
          read_by_staff: boolean
          sender_id: string
          sender_role: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          patient_id: string
          read_by_patient?: boolean
          read_by_staff?: boolean
          sender_id: string
          sender_role: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          patient_id?: string
          read_by_patient?: boolean
          read_by_staff?: boolean
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      consent_signatures: {
        Row: {
          consent_slug: string
          consent_title: string
          id: string
          signed_at: string
          signed_name: string
          user_id: string
          version: number
        }
        Insert: {
          consent_slug: string
          consent_title: string
          id?: string
          signed_at?: string
          signed_name: string
          user_id: string
          version?: number
        }
        Update: {
          consent_slug?: string
          consent_title?: string
          id?: string
          signed_at?: string
          signed_name?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      lab_appointments: {
        Row: {
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          contact_preference: string
          created_at: string
          for_product_id: string | null
          id: string
          lab_source: Database["public"]["Enums"]["lab_source"]
          notes: string | null
          order_id: string | null
          patient_name: string | null
          patient_phone: string | null
          slot_id: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          contact_preference?: string
          created_at?: string
          for_product_id?: string | null
          id?: string
          lab_source?: Database["public"]["Enums"]["lab_source"]
          notes?: string | null
          order_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          slot_id: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          contact_preference?: string
          created_at?: string
          for_product_id?: string | null
          id?: string
          lab_source?: Database["public"]["Enums"]["lab_source"]
          notes?: string | null
          order_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          slot_id?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_appointments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: true
            referencedRelation: "provider_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_fulfillments: {
        Row: {
          admin_note: string | null
          created_at: string
          draw_booked_at: string | null
          draw_completed_at: string | null
          for_product_id: string | null
          id: string
          order_id: string
          quest_link: string | null
          quest_reference: string | null
          ready_at: string | null
          ready_by: string | null
          results_at: string | null
          status: Database["public"]["Enums"]["quest_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          draw_booked_at?: string | null
          draw_completed_at?: string | null
          for_product_id?: string | null
          id?: string
          order_id: string
          quest_link?: string | null
          quest_reference?: string | null
          ready_at?: string | null
          ready_by?: string | null
          results_at?: string | null
          status?: Database["public"]["Enums"]["quest_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          draw_booked_at?: string | null
          draw_completed_at?: string | null
          for_product_id?: string | null
          id?: string
          order_id?: string
          quest_link?: string | null
          quest_reference?: string | null
          ready_at?: string | null
          ready_by?: string | null
          results_at?: string | null
          status?: Database["public"]["Enums"]["quest_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          created_at: string
          event_key: string
        }
        Insert: {
          created_at?: string
          event_key: string
        }
        Update: {
          created_at?: string
          event_key?: string
        }
        Relationships: []
      }
      order_approvals: {
        Row: {
          appointment_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          order_id: string | null
          patient_confirmed_at: string | null
          patient_message: string | null
          product_id: string | null
          product_name: string | null
          provider_note: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_id?: string | null
          patient_confirmed_at?: string | null
          patient_message?: string | null
          product_id?: string | null
          product_name?: string | null
          provider_note?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_id?: string | null
          patient_confirmed_at?: string | null
          patient_message?: string | null
          product_id?: string | null
          product_name?: string | null
          provider_note?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_approvals_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "lab_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_approvals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          for_product_id: string | null
          id: string
          order_id: string
          product_group: string
          product_id: string
          product_name: string
          quantity: number
          requires_labs: boolean
          unit_price_cents: number
          user_id: string
        }
        Insert: {
          created_at?: string
          for_product_id?: string | null
          id?: string
          order_id: string
          product_group: string
          product_id: string
          product_name: string
          quantity?: number
          requires_labs?: boolean
          unit_price_cents: number
          user_id: string
        }
        Update: {
          created_at?: string
          for_product_id?: string | null
          id?: string
          order_id?: string
          product_group?: string
          product_id?: string
          product_name?: string
          quantity?: number
          requires_labs?: boolean
          unit_price_cents?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          carrier: string | null
          completed_at: string | null
          created_at: string
          delivered_at: string | null
          id: string
          order_number: string
          payment_provider: string | null
          payment_ref: string | null
          requires_approval: boolean
          requires_labs: boolean
          shipped_at: string | null
          shipping_address1: string | null
          shipping_address2: string | null
          shipping_city: string | null
          shipping_name: string | null
          shipping_state: string | null
          shipping_zip: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier?: string | null
          completed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_number?: string
          payment_provider?: string | null
          payment_ref?: string | null
          requires_approval?: boolean
          requires_labs?: boolean
          shipped_at?: string | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier?: string | null
          completed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          order_number?: string
          payment_provider?: string | null
          payment_ref?: string | null
          requires_approval?: boolean
          requires_labs?: boolean
          shipped_at?: string | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_documents: {
        Row: {
          created_at: string
          file_name: string
          for_product_id: string | null
          id: string
          kind: string
          lab_source: Database["public"]["Enums"]["lab_source"] | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          for_product_id?: string | null
          id?: string
          kind?: string
          lab_source?: Database["public"]["Enums"]["lab_source"] | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          for_product_id?: string | null
          id?: string
          kind?: string
          lab_source?: Database["public"]["Enums"]["lab_source"] | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_intakes: {
        Row: {
          allergies: string | null
          biological_sex: string | null
          conditions: string | null
          created_at: string
          date_of_birth: string | null
          goals: string | null
          height_in: number | null
          medications: string | null
          pregnancy_status: string | null
          shipping_address1: string | null
          shipping_address2: string | null
          shipping_city: string | null
          shipping_name: string | null
          shipping_state: string | null
          shipping_zip: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
          weight_lb: number | null
        }
        Insert: {
          allergies?: string | null
          biological_sex?: string | null
          conditions?: string | null
          created_at?: string
          date_of_birth?: string | null
          goals?: string | null
          height_in?: number | null
          medications?: string | null
          pregnancy_status?: string | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          weight_lb?: number | null
        }
        Update: {
          allergies?: string | null
          biological_sex?: string | null
          conditions?: string | null
          created_at?: string
          date_of_birth?: string | null
          goals?: string | null
          height_in?: number | null
          medications?: string | null
          pregnancy_status?: string | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_name?: string | null
          shipping_state?: string | null
          shipping_zip?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          weight_lb?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          gender_preference: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          gender_preference?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          gender_preference?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_slots: {
        Row: {
          created_at: string
          duration_minutes: number | null
          end_time: string
          external_id: string | null
          id: string
          meeting_mode: string
          provider_id: string
          provider_name: string
          slot_date: string
          start_time: string
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          end_time: string
          external_id?: string | null
          id?: string
          meeting_mode?: string
          provider_id: string
          provider_name?: string
          slot_date: string
          start_time: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          end_time?: string
          external_id?: string | null
          id?: string
          meeting_mode?: string
          provider_id?: string
          provider_name?: string
          slot_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Relationships: []
      }
      refill_requests: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          product_id: string
          product_name: string
          status: Database["public"]["Enums"]["refill_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id: string
          product_name: string
          status?: Database["public"]["Enums"]["refill_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          product_id?: string
          product_name?: string
          status?: Database["public"]["Enums"]["refill_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refill_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "provider" | "patient"
      appointment_status: "scheduled" | "completed" | "cancelled" | "no_show"
      appointment_type:
        | "lab_review"
        | "treatment_approval"
        | "initial_consult"
        | "follow_up"
      approval_status: "pending" | "approved" | "denied" | "more_info"
      document_status: "pending_review" | "verified" | "rejected"
      lab_source: "uploaded" | "purchased"
      order_status:
        | "pending_payment"
        | "paid"
        | "in_review"
        | "approved"
        | "denied"
        | "fulfilled"
        | "cancelled"
      quest_status: "awaiting_setup" | "ready" | "results_received"
      refill_status: "requested" | "approved" | "denied" | "fulfilled"
      slot_status: "open" | "booked" | "cancelled"
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
      app_role: ["admin", "provider", "patient"],
      appointment_status: ["scheduled", "completed", "cancelled", "no_show"],
      appointment_type: [
        "lab_review",
        "treatment_approval",
        "initial_consult",
        "follow_up",
      ],
      approval_status: ["pending", "approved", "denied", "more_info"],
      document_status: ["pending_review", "verified", "rejected"],
      lab_source: ["uploaded", "purchased"],
      order_status: [
        "pending_payment",
        "paid",
        "in_review",
        "approved",
        "denied",
        "fulfilled",
        "cancelled",
      ],
      quest_status: ["awaiting_setup", "ready", "results_received"],
      refill_status: ["requested", "approved", "denied", "fulfilled"],
      slot_status: ["open", "booked", "cancelled"],
    },
  },
} as const
