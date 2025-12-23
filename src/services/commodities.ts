
export interface Commodity {
    id: string;
    name: string;
    price_gram_usd: number; // Global price
    price_gram_dzd: number; // Local price (often calculated or scraped)
    change_24h?: number; // Percent change
    timestamp: string;
}

export const MOCK_COMMODITIES: Commodity[] = [
    {
        id: '1',
        name: 'Gold 24k',
        price_gram_usd: 65.50,
        price_gram_dzd: 14500, // Approximate black market
        timestamp: new Date().toISOString(),
    },
    {
        id: '2',
        name: 'Gold 18k',
        price_gram_usd: 49.10,
        price_gram_dzd: 10800,
        timestamp: new Date().toISOString(),
    },
    {
        id: '3',
        name: 'Silver',
        price_gram_usd: 0.85,
        price_gram_dzd: 220,
        timestamp: new Date().toISOString(),
    },
    {
        id: '4',
        name: 'Gold Lingot (1kg)',
        price_gram_usd: 65500,
        price_gram_dzd: 14500000,
        timestamp: new Date().toISOString(),
    },
];

export async function fetchCommodities(): Promise<Commodity[]> {
    // In real app, fetch from 'commodities' table
    /*
    const { data, error } = await supabase
      .from('commodities')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
    */

    // Return mock for now
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(MOCK_COMMODITIES);
        }, 1000);
    });
}
