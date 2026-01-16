import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

console.log("Hello from Fetch Rates Function!");

// Currency mapping for consistency
const CURRENCY_MAP: Record<string, string> = {
    'EUR': 'EUR',
    'USD': 'USD',
    'GBP': 'GBP',
    'CAD': 'CAD',
    'CHF': 'CHF',
    'TRY': 'TRY',
    'CNY': 'CNY',
    'SAR': 'SAR',
    'AED': 'AED',
    'TND': 'TND',
    'MAD': 'MAD',
    'JPY': 'JPY',
    'DKK': 'DKK',
    'SEK': 'SEK',
    'NOK': 'NOK',
    'KWD': 'KWD',
    'LYD': 'LYD',
    'MRU': 'MRU',
    'SDR': 'SDR'
};

interface RateData {
    currency: string;
    type: 'OFFICIAL' | 'BLACK_MARKET';
    buy_price: number;
    sell_price: number;
    source: string;
    date: string;
    created_at: string;
}

interface ScrapedRate {
    currency: string;
    buy_price: number;
    sell_price: number;
    source: string;
}

interface MarginData {
    currency: string;
    buy_margin: number;
    sell_margin: number;
}

// Timeout helper using AbortController
async function fetchWithTimeout(url: string, options: any = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

async function scrapeOfficialRates(): Promise<RateData[]> {
    const rates: RateData[] = [];
    const timestamp = new Date().toISOString();

    try {
        log("Fetching official rates from Bank of Algeria via proxy...");
        // Use corsproxy.io to bypass SSL UnknownIssuer issue on Bank of Algeria site
        const targetUrl = 'https://www.bank-of-algeria.dz/taux-de-change-journalier/';
        const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;

        const response = await fetchWithTimeout(proxyUrl, {}, 15000);
        const html = await response.text();
        const $ = cheerio.load(html);

        log(`Scraping attempted. HTML length: ${html.length}`);

        // Target the elementor shortcode container which holds the side-by-side tables
        const container = $('.elementor-shortcode');
        let currentDate = new Date().toLocaleDateString('fr-FR');

        if (container.length > 0) {
            log("Found elementor-shortcode container");

            const firstTable = container.find('table').first();
            if (firstTable.length > 0) {
                log("Found first table");

                // Extract date from thead th (usually second cell has the date)
                const dateHeader = firstTable.find('thead tr th').eq(1).text().trim();
                if (dateHeader) {
                    currentDate = dateHeader;
                    log(`Extracted date: ${currentDate}`);
                }

                firstTable.find('tbody tr').each((i, row) => {
                    const cols = $(row).find('td');
                    if (cols.length >= 2) {
                        const currency = $(cols[0]).text().trim();
                        const rateText = $(cols[1]).text().trim();

                        if (CURRENCY_MAP[currency]) {
                            let buyOfficial = parseFloat(rateText.replace(',', '.'));

                            if (!isNaN(buyOfficial)) {
                                // JPY Fix: Bank of Algeria quotes JPY per 100 units
                                if (currency === 'JPY') {
                                    buyOfficial = buyOfficial / 100;
                                    log(`Adjusted JPY rate: ${buyOfficial}`);
                                }

                                const sellOfficial = buyOfficial * 1.02;

                                rates.push({
                                    currency: CURRENCY_MAP[currency],
                                    type: 'OFFICIAL',
                                    buy_price: parseFloat(buyOfficial.toFixed(4)),
                                    sell_price: parseFloat(sellOfficial.toFixed(4)),
                                    source: 'Bank of Algeria',
                                    date: currentDate,
                                    created_at: timestamp,
                                });
                            }
                        }
                    }
                });
            }
        }

        log(`Successfully scraped ${rates.length} official rates`);

    } catch (error) {
        errorLog("Error scraping official rates:", error);
    }

    // Fallback to mock data if no official rates were scraped
    if (rates.length === 0) {
        log("No official rates scraped, using hardcoded fallback");
        const officialBase = {
            USD: 129.5621,
            EUR: 152.1189,
            GBP: 173.1998,
            JPY: 0.830979, // Corrected JPY fallback (83.0979 / 100)
            CNY: 18.3997,
            CHF: 162.8791,
            CAD: 94.0594,
            DKK: 20.3466,
            SEK: 13.9637,
            NOK: 12.6892,
            AED: 35.2781,
            SAR: 34.5416,
            KWD: 422.0952,
            TND: 44.3934,
            MAD: 14.1461,
            LYD: 23.8947,
            MRU: 3.2611,
            SDR: 177.0173,
        };

        const currentDate = new Date().toLocaleDateString('fr-FR');

        for (const [currency, buyOfficial] of Object.entries(officialBase)) {
            const sellOfficial = buyOfficial * 1.02;

            rates.push({
                currency,
                type: 'OFFICIAL',
                buy_price: parseFloat(buyOfficial.toFixed(4)),
                sell_price: parseFloat(sellOfficial.toFixed(4)),
                source: 'Bank of Algeria (Fallback)',
                date: currentDate,
                created_at: timestamp,
            });
        }
    }

    return rates;
}

async function scrapeSquareAlger(): Promise<ScrapedRate[]> {
    const scrapedRates: ScrapedRate[] = [];

    try {
        log("Fetching black market rates from Square Alger API...");
        const apiUrl = "https://supabase.01prompt.io/rest/v1/currency_rates?select=*&limit=20";
        const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MjYzNTQyMCwiZXhwIjo0OTE4MzA5MDIwLCJyb2xlIjoiYW5vbiJ9.IWDlBD2rd053XonAu3yVDFjKv9N2YNk06C60KhzMTx0";

        const response = await fetchWithTimeout(apiUrl, {
            method: "GET",
            headers: {
                "apikey": apiKey,
                "Authorization": `Bearer ${apiKey}`
            }
        }, 8000); // 8s timeout

        if (!response.ok) throw new Error(`API returned status ${response.status}`);

        const data = await response.json();
        for (const item of data) {
            if (CURRENCY_MAP[item.currency_code]) {
                scrapedRates.push({
                    currency: CURRENCY_MAP[item.currency_code],
                    buy_price: item.buy_rate,
                    sell_price: item.sell_rate,
                    source: 'Square Alger'
                });
            }
        }
    } catch (error) {
        errorLog("Error fetching from Square Alger API:", error);
    }
    return scrapedRates;
}

async function scrapeForexAlgerie(): Promise<ScrapedRate[]> {
    const scrapedRates: ScrapedRate[] = [];

    try {
        log("Fetching black market rates from Forex Algérie API...");
        const response = await fetchWithTimeout('http://www.forexalgerie.com/connect/updateExchange.php', {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: "afous=moh!12!"
        }, 8000); // 8s timeout

        if (!response.ok) throw new Error(`API returned status ${response.status}`);

        const data = await response.json();
        if (data && data.length > 0) {
            const item = data[0];
            const apiMapping: Record<string, string> = {
                'eur': 'EUR', 'usd': 'USD', 'cad': 'CAD', 'gbp': 'GBP',
                'cny': 'CNY', 'try': 'TRY', 'chf': 'CHF', 'sar': 'SAR',
                'aed': 'AED', 'tnd': 'TND', 'mad': 'MAD'
            };

            for (const [keyPrefix, currencyCode] of Object.entries(apiMapping)) {
                const buyKey = `${keyPrefix}_buy` as any;
                const sellKey = `${keyPrefix}_sell` as any;
                const buyPrice = parseFloat(item[buyKey]);
                const sellPrice = parseFloat(item[sellKey]);

                if (!isNaN(buyPrice) && !isNaN(sellPrice)) {
                    scrapedRates.push({
                        currency: currencyCode,
                        buy_price: sellPrice, // Swap: customer buys at sellPrice
                        sell_price: buyPrice, // Swap: customer sells at buyPrice
                        source: 'Forex Algérie'
                    });
                }
            }
        }
    } catch (error) {
        errorLog("Error fetching from Forex Algérie API:", error);
    }
    return scrapedRates;
}

async function fetchMargins(): Promise<Record<string, MarginData>> {
    try {
        log("Fetching rate margins from database...");
        const { data, error } = await supabase.from('rate_margins').select('*');
        if (error) throw error;

        const margins: Record<string, MarginData> = {};
        data?.forEach((m: any) => {
            margins[m.currency] = m;
        });
        return margins;
    } catch (error) {
        errorLog("Failed to fetch margins:", error);
        return {};
    }
}

async function scrapeBlackMarketRates(officialRates: RateData[]): Promise<RateData[]> {
    log("Scraping black market rates from multiple sources...");
    const allScrapedRates: ScrapedRate[][] = [];

    // Attempt external sources
    const [square, forex] = await Promise.all([scrapeSquareAlger(), scrapeForexAlgerie()]);
    if (square.length > 0) allScrapedRates.push(square);
    if (forex.length > 0) allScrapedRates.push(forex);

    const timestamp = new Date().toISOString();
    const currentDate = new Date().toLocaleDateString('fr-FR');

    if (allScrapedRates.length > 0) {
        const rates: RateData[] = [];
        const ratesByCurrency: Record<string, { buy: number[], sell: number[], sources: string[] }> = {};

        allScrapedRates.forEach(rateArray => {
            rateArray.forEach(rate => {
                if (!ratesByCurrency[rate.currency]) {
                    ratesByCurrency[rate.currency] = { buy: [], sell: [], sources: [] };
                }
                ratesByCurrency[rate.currency].buy.push(rate.buy_price);
                ratesByCurrency[rate.currency].sell.push(rate.sell_price);
                ratesByCurrency[rate.currency].sources.push(rate.source);
            });
        });

        for (const [currency, data] of Object.entries(ratesByCurrency)) {
            data.buy.sort((a, b) => a - b);
            data.sell.sort((a, b) => a - b);
            const medianBuy = data.buy[Math.floor(data.buy.length / 2)];
            const medianSell = data.sell[Math.floor(data.sell.length / 2)];
            const uniqueSources = [...new Set(data.sources)];

            rates.push({
                currency,
                type: 'BLACK_MARKET',
                buy_price: parseFloat(medianBuy.toFixed(2)),
                sell_price: parseFloat(medianSell.toFixed(2)),
                source: uniqueSources.join(' + '),
                date: currentDate,
                created_at: timestamp,
            });
        }
        return rates;
    }

    // Failover: Use Margin-based Approach
    log("External scraping failed or returned no data. Using margin-based fallback...");
    const margins = await fetchMargins();
    const fallbackRates: RateData[] = [];

    officialRates.forEach(official => {
        const margin = margins[official.currency];
        if (margin) {
            fallbackRates.push({
                currency: official.currency,
                type: 'BLACK_MARKET',
                buy_price: parseFloat((official.buy_price + margin.buy_margin).toFixed(2)),
                sell_price: parseFloat((official.sell_price + margin.sell_margin).toFixed(2)),
                source: 'Calculated (Official + Margin)',
                date: official.date,
                created_at: timestamp,
            });
        }
    });

    log(`Generated ${fallbackRates.length} parallel rates using margins fallback`);
    return fallbackRates;
}

const debugLogs: string[] = [];
function log(message: string) {
    const timestamp = new Date().toISOString().split('T')[1];
    debugLogs.push(`[${timestamp}] ${message}`);
    console.log(message);
}

function errorLog(message: string, error?: any) {
    const timestamp = new Date().toISOString().split('T')[1];
    const msg = `ERROR: ${message} ${error?.message || error}`;
    debugLogs.push(`[${timestamp}] ${msg}`);
    console.error(message, error);
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
    debugLogs.length = 0;
    log("Function invoked");

    try {
        const officialRates = await scrapeOfficialRates();
        const blackMarketRates = await scrapeBlackMarketRates(officialRates);
        const allRates = [...officialRates, ...blackMarketRates];

        if (allRates.length === 0) throw new Error("No rates scraped");

        log(`Inserting ${allRates.length} records into Supabase`);
        const { error } = await supabase.from('rates').insert(allRates);
        if (error) throw error;

        return new Response(JSON.stringify({
            message: "Rates updated successfully",
            total_count: allRates.length,
            official_count: officialRates.length,
            black_market_count: blackMarketRates.length,
            logs: debugLogs
        }), { headers: { "Content-Type": "application/json" } });

    } catch (error) {
        errorLog('Function error', error);
        return new Response(JSON.stringify({
            error: error.message,
            logs: debugLogs
        }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
});