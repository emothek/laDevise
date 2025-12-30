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
      },
      market_offers: {
        Row: {
          id: string
          user_id: string
          type: 'OFFER' | 'REQUEST'
          currency_from: string
          currency_to: string
          amount: number
          min_amount: number | null
          rate: number | null
          payment_methods: string[]
          wilaya: string | null
          commune: string | null
          expires_at: string | null
          status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'DELETED'
          contact_info_hidden: boolean | null
          contact_preference: string | null
          phone_number: string | null
          settled_request_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'OFFER' | 'REQUEST'
          currency_from: string
          currency_to?: string
          amount: number
          min_amount?: number | null
          rate?: number | null
          payment_methods: string[]
          wilaya?: string | null
          commune?: string | null
          expires_at?: string | null
          status?: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'DELETED'
          contact_info_hidden?: boolean | null
          contact_preference?: string | null
          phone_number?: string | null
          settled_request_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'OFFER' | 'REQUEST'
          currency_from?: string
          currency_to?: string
          amount?: number
          min_amount?: number | null
          rate?: number | null
          payment_methods?: string[]
          wilaya?: string | null
          commune?: string | null
          expires_at?: string | null
          status?: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'DELETED'
          contact_info_hidden?: boolean | null
          contact_preference?: string | null
          phone_number?: string | null
          settled_request_id?: string | null
          created_at?: string
        }
      },
      market_requests: {
        Row: {
          id: string
          offer_id: string
          requester_id: string
          status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
          proposed_rate: number
          proposed_amount: number
          proposed_location: string | null
          payment_method: string | null
          created_at: string
        }
        Insert: {
          id?: string
          offer_id: string
          requester_id: string
          status?: 'PENDING' | 'ACCEPTED' | 'REJECTED'
          proposed_rate: number
          proposed_amount: number
          proposed_location?: string | null
          payment_method?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          offer_id?: string
          requester_id?: string
          status?: 'PENDING' | 'ACCEPTED' | 'REJECTED'
          proposed_rate?: number
          proposed_amount?: number
          proposed_location?: string | null
          payment_method?: string | null
          created_at?: string
        }
      }
    }
  }
}
