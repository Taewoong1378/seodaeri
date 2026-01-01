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
      dividends: {
        Row: {
          id: string
          user_id: string
          ticker: string
          name: string | null
          amount_krw: number
          amount_usd: number
          dividend_date: string
          sheet_synced: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ticker: string
          name?: string | null
          amount_krw?: number
          amount_usd?: number
          dividend_date: string
          sheet_synced?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ticker?: string
          name?: string | null
          amount_krw?: number
          amount_usd?: number
          dividend_date?: string
          sheet_synced?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'dividends_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      deposits: {
        Row: {
          id: string
          user_id: string
          type: 'DEPOSIT' | 'WITHDRAW'
          amount: number
          currency: string
          deposit_date: string
          memo: string | null
          sheet_synced: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'DEPOSIT' | 'WITHDRAW'
          amount: number
          currency?: string
          deposit_date: string
          memo?: string | null
          sheet_synced?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'DEPOSIT' | 'WITHDRAW'
          amount?: number
          currency?: string
          deposit_date?: string
          memo?: string | null
          sheet_synced?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deposits_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      portfolio_snapshots: {
        Row: {
          id: string
          user_id: string
          snapshot_date: string
          total_asset: number | null
          total_invested: number | null
          total_profit: number | null
          yield_percent: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          snapshot_date: string
          total_asset?: number | null
          total_invested?: number | null
          total_profit?: number | null
          yield_percent?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          snapshot_date?: string
          total_asset?: number | null
          total_invested?: number | null
          total_profit?: number | null
          yield_percent?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'portfolio_snapshots_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      holdings: {
        Row: {
          user_id: string
          ticker: string
          name: string | null
          quantity: number | null
          avg_price: number | null
          currency: string
          broker: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          ticker: string
          name?: string | null
          quantity?: number | null
          avg_price?: number | null
          currency?: string
          broker?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          ticker?: string
          name?: string | null
          quantity?: number | null
          avg_price?: number | null
          currency?: string
          broker?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'holdings_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      stocks: {
        Row: {
          code: string
          name: string
          full_code: string | null
          market: string
          eng_name: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          code: string
          name: string
          full_code?: string | null
          market: string
          eng_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string
          full_code?: string | null
          market?: string
          eng_name?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_metadata: {
        Row: {
          key: string
          value: Json | null
          updated_at: string
        }
        Insert: {
          key: string
          value?: Json | null
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json | null
          updated_at?: string
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
      transaction_type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAW'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
