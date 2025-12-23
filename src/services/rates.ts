
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
        // Fetch the latest rates
        // We order by created_at descending to get the most recent scrape
        const { data, error } = await supabase
            .from('rates')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Fetch enough to cover all currencies (approx 20 official + 20 black market)

        if (error) {
            console.error('Error fetching rates:', error);
            throw error;
        }

        if (!data || data.length === 0) {
            return [];
        }

        // The query returns latest first, which is what we want.
        // However, if we have multiple scrapes, we might just want to ensure we don't mix days?
        // For now, limiting to 50 is a reasonable heuristic if we scrape daily.
        // A robust way would be to find the max date, but let's start simple.

        return data as ExchangeRate[];

    } catch (error) {
        console.error('Unexpected error fetching rates:', error);
        // Fallback to empty or could return cached/mock if desired
        return [];
    }
};
