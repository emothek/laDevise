
export interface Commodity {
    id: string;
    name: string;
    price_gram_usd: number; // Global price
    price_gram_eur?: number; // Global price in EUR (for parallel calc)
    price_gram_dzd: number; // Official Local price
    price_gram_dzd_parallel?: number; // Calculated Parallel price
    change_24h?: number; // Percent change
    timestamp: string;
}

export const MOCK_COMMODITIES: Commodity[] = [
    {
        id: '1',
        name: 'Gold 24k',
        price_gram_usd: 65.50,
        price_gram_eur: 60.00,
        price_gram_dzd: 14500,
        price_gram_dzd_parallel: 15200,
        timestamp: new Date().toISOString(),
    },
    {
        id: '2',
        name: 'Gold 18k',
        price_gram_usd: 49.10,
        price_gram_eur: 45.00,
        price_gram_dzd: 10800,
        price_gram_dzd_parallel: 11400,
        timestamp: new Date().toISOString(),
    },
    {
        id: '3',
        name: 'Silver',
        price_gram_usd: 0.85,
        price_gram_eur: 0.78,
        price_gram_dzd: 220,
        price_gram_dzd_parallel: 240,
        timestamp: new Date().toISOString(),
    },
    {
        id: '4',
        name: 'Gold Lingot (1kg)',
        price_gram_usd: 65500,
        price_gram_eur: 60000,
        price_gram_dzd: 14500000,
        price_gram_dzd_parallel: 15200000,
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
