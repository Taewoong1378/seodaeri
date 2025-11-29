export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          name: string | null
          image: string | null
          spreadsheet_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          image?: string | null
          spreadsheet_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          name?: string | null
          image?: string | null
          spreadsheet_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          ticker: string
          name: string | null
          type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAW'
          price: number | null
          quantity: number | null
          total_amount: number | null
          trade_date: string | null
          image_url: string | null
          sheet_synced: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          name?: string | null
          type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAW'
          price?: number | null
          quantity?: number | null
          total_amount?: number | null
          trade_date?: string | null
          image_url?: string | null
          sheet_synced?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          name?: string | null
          type?: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAW'
          price?: number | null
          quantity?: number | null
          total_amount?: number | null
          trade_date?: string | null
          image_url?: string | null
          sheet_synced?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      portfolio_cache: {
        Row: {
          user_id: string
          ticker: string
          avg_price: number | null
          quantity: number | null
          current_price: number | null
          currency: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          ticker: string
          avg_price?: number | null
          quantity?: number | null
          current_price?: number | null
          currency?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          ticker?: string
          avg_price?: number | null
          quantity?: number | null
          current_price?: number | null
          currency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'portfolio_cache_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
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
      transaction_type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAW'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
