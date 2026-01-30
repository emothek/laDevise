
import { supabase } from '@/lib/supabase';

export type RateType = 'OFFICIAL' | 'BLACK_MARKET';

export interface ExchangeRate {
    id: string;
    currency: string;
    type: RateType;
    buy_price: number;
    sell_price: number;
    source?: string;
    created_at: string;
}



// ... (retain interfaces)

export const fetchRates = async (): Promise<ExchangeRate[]> => {
    try {
        // Create a timeout promise that rejects after 10 seconds
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error('REQUEST_TIMEOUT'));
            }, 10000);
        });

        // Race between the fetch and the timeout
        // We order by created_at descending to get the most recent scrape
        const { data, error } = await Promise.race([
            supabase
                .from('rates')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50), // Fetch enough to cover all currencies (approx 20 official + 20 black market)
            timeoutPromise
        ]) as any; // Cast to clean up the race type inference locally

        if (error) {
            console.error('Error fetching rates:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data as ExchangeRate[];

    } catch (error) {
        console.error('Unexpected error fetching rates:', error);
        // We re-throw so React Query can catch it and show error state
        throw error;
    }
};
