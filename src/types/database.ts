export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          url: string;
          platform: "woocommerce" | "wordpress";
          status: "pending" | "connected" | "disconnected" | "error";
          connection_config: Json | null;
          last_sync_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          url: string;
          platform?: "woocommerce" | "wordpress";
          status?: "pending" | "connected" | "disconnected" | "error";
          connection_config?: Json | null;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          url?: string;
          platform?: "woocommerce" | "wordpress";
          status?: "pending" | "connected" | "disconnected" | "error";
          connection_config?: Json | null;
          last_sync_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          store_id: string;
          key_hash: string;
          key_prefix: string;
          name: string;
          permissions: string[];
          last_used_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          key_hash: string;
          key_prefix: string;
          name?: string;
          permissions?: string[];
          last_used_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          key_hash?: string;
          key_prefix?: string;
          name?: string;
          permissions?: string[];
          last_used_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          external_id: string;
          name: string;
          description: string | null;
          meta_title: string | null;
          meta_description: string | null;
          images: Json | null;
          schema_markup: Json | null;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          external_id: string;
          name: string;
          description?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          images?: Json | null;
          schema_markup?: Json | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          external_id?: string;
          name?: string;
          description?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          images?: Json | null;
          schema_markup?: Json | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      pages: {
        Row: {
          id: string;
          store_id: string;
          external_id: string;
          title: string;
          page_type: "homepage" | "about" | "contact" | "policy" | "category" | "other";
          meta_title: string | null;
          meta_description: string | null;
          schema_markup: Json | null;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          external_id: string;
          title: string;
          page_type?: "homepage" | "about" | "contact" | "policy" | "category" | "other";
          meta_title?: string | null;
          meta_description?: string | null;
          schema_markup?: Json | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          external_id?: string;
          title?: string;
          page_type?: "homepage" | "about" | "contact" | "policy" | "category" | "other";
          meta_title?: string | null;
          meta_description?: string | null;
          schema_markup?: Json | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      blog_posts: {
        Row: {
          id: string;
          store_id: string;
          external_id: string | null;
          title: string;
          content: string | null;
          meta_title: string | null;
          meta_description: string | null;
          status: "draft" | "pending" | "published";
          schema_markup: Json | null;
          published_at: string | null;
          synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          external_id?: string | null;
          title: string;
          content?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          status?: "draft" | "pending" | "published";
          schema_markup?: Json | null;
          published_at?: string | null;
          synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string;
          external_id?: string | null;
          title?: string;
          content?: string | null;
          meta_title?: string | null;
          meta_description?: string | null;
          status?: "draft" | "pending" | "published";
          schema_markup?: Json | null;
          published_at?: string | null;
          synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      billing_records: {
        Row: {
          id: string;
          organization_id: string;
          invoice_id: string | null;
          amount: number;
          currency: string;
          status: "pending" | "paid" | "failed" | "refunded";
          period_start: string;
          period_end: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          invoice_id?: string | null;
          amount: number;
          currency?: string;
          status?: "pending" | "paid" | "failed" | "refunded";
          period_start: string;
          period_end: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          invoice_id?: string | null;
          amount?: number;
          currency?: string;
          status?: "pending" | "paid" | "failed" | "refunded";
          period_start?: string;
          period_end?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
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
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
