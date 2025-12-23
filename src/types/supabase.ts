export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      rates: {
        Row: {
          id: string
          currency: string
          type: 'OFFICIAL' | 'BLACK_MARKET'
          buy_price: number
          sell_price: number
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          currency: string
          type: 'OFFICIAL' | 'BLACK_MARKET'
          buy_price: number
          sell_price: number
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          currency?: string
          type?: 'OFFICIAL' | 'BLACK_MARKET'
          buy_price?: number
          sell_price?: number
          source?: string | null
          created_at?: string
        }
      }
      commodities: {
        Row: {
          id: string
          name: string
          price_gram_usd: number
          price_gram_dzd: number
          timestamp: string
        }
        Insert: {
          id?: string
          name: string
          price_gram_usd: number
          price_gram_dzd: number
          timestamp?: string
        }
        Update: {
          id?: string
          name?: string
          price_gram_usd?: number
          price_gram_dzd?: number
          timestamp?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          role: 'user' | 'admin' | 'super_admin'
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          role?: 'user' | 'admin' | 'super_admin'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          role?: 'user' | 'admin' | 'super_admin'
          created_at?: string
        }
      }
      user_assets: {
        Row: {
          id: string
          user_id: string
          currency: string
          amount: number
          label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          currency: string
          amount: number
          label?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          currency?: string
          amount?: number
          label?: string | null
          created_at?: string
        }
      },
      push_subscriptions: {
        Row: {
          token: string
          user_id: string | null
          favorite_currencies: string[] | null
          updated_at: string
          created_at: string
        }
        Insert: {
          token: string
          user_id?: string | null
          favorite_currencies?: string[] | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          token?: string
          user_id?: string | null
          favorite_currencies?: string[] | null
          updated_at?: string
          created_at?: string
        }
      }
    }
  }
}
