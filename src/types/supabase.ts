Need to install the following packages:
supabase@2.111.0
Ok to proceed? (y) 
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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          id: string
          last_login: string | null
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_login?: string | null
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_login?: string | null
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      annotation_labels: {
        Row: {
          annotation_id: string
          label_id: string
        }
        Insert: {
          annotation_id: string
          label_id: string
        }
        Update: {
          annotation_id?: string
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotation_labels_annotation_id_fkey"
            columns: ["annotation_id"]
            isOneToOne: false
            referencedRelation: "annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotation_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      annotations: {
        Row: {
          admin_id: string
          book_id: string
          chapter_id: string
          created_at: string
          end_offset: number
          id: string
          note: string | null
          selected_text: string
          start_offset: number
          updated_at: string
        }
        Insert: {
          admin_id: string
          book_id: string
          chapter_id: string
          created_at?: string
          end_offset: number
          id?: string
          note?: string | null
          selected_text: string
          start_offset: number
          updated_at?: string
        }
        Update: {
          admin_id?: string
          book_id?: string
          chapter_id?: string
          created_at?: string
          end_offset?: number
          id?: string
          note?: string | null
          selected_text?: string
          start_offset?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "annotations_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annotations_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          title: string
          total_word_count: number | null
          updated_at: string | null
        }
        Insert: {
          author: string
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title: string
          total_word_count?: number | null
          updated_at?: string | null
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          title?: string
          total_word_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          book_id: string
          created_at: string | null
          id: string
          order: number
          proofread: boolean | null
          title: string
          volume_id: string | null
          word_count: number | null
        }
        Insert: {
          book_id: string
          created_at?: string | null
          id?: string
          order: number
          proofread?: boolean | null
          title: string
          volume_id?: string | null
          word_count?: number | null
        }
        Update: {
          book_id?: string
          created_at?: string | null
          id?: string
          order?: number
          proofread?: boolean | null
          title?: string
          volume_id?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      foreshadowing: {
        Row: {
          admin_id: string
          book_id: string
          created_at: string
          id: string
          planted_annotation_id: string | null
          resolved_annotation_id: string | null
          resolved_at: string | null
          status: string
          title: string
        }
        Insert: {
          admin_id: string
          book_id: string
          created_at?: string
          id?: string
          planted_annotation_id?: string | null
          resolved_annotation_id?: string | null
          resolved_at?: string | null
          status?: string
          title: string
        }
        Update: {
          admin_id?: string
          book_id?: string
          created_at?: string
          id?: string
          planted_annotation_id?: string | null
          resolved_annotation_id?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "foreshadowing_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreshadowing_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreshadowing_planted_annotation_id_fkey"
            columns: ["planted_annotation_id"]
            isOneToOne: false
            referencedRelation: "annotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreshadowing_resolved_annotation_id_fkey"
            columns: ["resolved_annotation_id"]
            isOneToOne: false
            referencedRelation: "annotations"
            referencedColumns: ["id"]
          },
        ]
      }
      labels: {
        Row: {
          admin_id: string
          book_id: string | null
          color: string
          created_at: string
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          admin_id: string
          book_id?: string | null
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          admin_id?: string
          book_id?: string | null
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "labels_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "labels_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          book_id: string
          chapter_id: string
          id: string
          scroll_position: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id: string
          id?: string
          scroll_position?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string
          id?: string
          scroll_position?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          chapter_id: string
          content: string
          id: string
          updated_at: string | null
        }
        Insert: {
          chapter_id: string
          content: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          chapter_id?: string
          content?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_contents_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: true
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      volumes: {
        Row: {
          book_id: string
          created_at: string
          id: string
          order: number
          title: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          order?: number
          title: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "volumes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
