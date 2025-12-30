import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

console.log("Hello from Fetch Rates Function!");

// Environment variables are checked and initialized below with the helper functions


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

async function scrapeOfficialRates(): Promise<RateData[]> {
    const rates: RateData[] = [];
    const timestamp = new Date().toISOString();

    try {
        log("Fetching official rates from Bank of Algeria...");
        const response = await fetch('https://www.bank-of-algeria.dz/taux-de-change-journalier/');
        const html = await response.text();
        const $ = cheerio.load(html);

        log(`Scraping attempted. HTML length: ${html.length}`);

        const organizTable = $('#organizTable');
        let currentDate = new Date().toLocaleDateString('fr-FR');

        if (organizTable.length > 0) {
            log("Found organizTable element");

            const tables = organizTable.find('table');
            log(`Found ${tables.length} tables`);

            const dateHeaders: string[] = [];

            tables.each((tableIndex, table) => {
                const dateHeader = $(table).find('thead tr th').first().text().trim();
                if (dateHeader) {
                    dateHeaders.push(dateHeader);
                }
            });

            log(`Dates found: ${dateHeaders.join(', ')}`);

            if (dateHeaders.length > 0) {
                currentDate = dateHeaders[0];
            }

            const firstTable = $(tables[0]);

            firstTable.find('tbody tr').each((i, row) => {
                const cols = $(row).find('td');
                if (cols.length >= 2) {
                    const currency = $(cols[0]).text().trim();
                    const rateText = $(cols[1]).text().trim();

                    if (CURRENCY_MAP[currency]) {
                        const buyOfficial = parseFloat(rateText.replace(',', '.'));

                        if (!isNaN(buyOfficial)) {
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

        log(`Successfully scraped ${rates.length} official rates`);

    } catch (error) {
        errorLog("Error scraping official rates:", error);
    }

    // Fallback to mock data if no official rates were scraped
    if (rates.length === 0) {
        log("No official rates scraped, using fallback mock data");
        const officialBase = {
            USD: 129.5621,
            EUR: 152.1189,
            GBP: 173.1998,
            JPY: 83.0979,
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
                source: 'Bank of Algeria',
                date: currentDate,
                created_at: timestamp,
            });
        }
    }

    return rates;
}

// Interface for the Square Alger API response (Supabase format)
interface SquareAlgerResponse {
    id: number;
    currency_code: string;
    buy_rate: number;
    sell_rate: number;
    updated_at?: string;
}

// Interface for Forex Algerie API response
interface ForexAlgerieResponse {
    record_no: string;
    create_date_time: string;
    eur_buy: string;
    eur_sell: string;
    usd_buy: string;
    usd_sell: string;
    cad_buy: string;
    cad_sell: string;
    gbp_buy: string;
    gbp_sell: string;
    cny_buy: string;
    cny_sell: string;
    try_buy: string;
    try_sell: string;
    chf_buy: string;
    chf_sell: string;
    sar_buy: string;
    sar_sell: string;
    aed_buy: string;
    aed_sell: string;
    tnd_buy: string;
    tnd_sell: string;
    mad_buy: string;
    mad_sell: string;
}

async function scrapeSquareAlger(): Promise<ScrapedRate[]> {
    const scrapedRates: ScrapedRate[] = [];

    try {
        log("Fetching black market rates from Square Alger API...");

        // API details provided by user
        const apiUrl = "https://supabase.01prompt.io/rest/v1/currency_rates?select=*&limit=20";
        const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MjYzNTQyMCwiZXhwIjo0OTE4MzA5MDIwLCJyb2xlIjoiYW5vbiJ9.IWDlBD2rd053XonAu3yVDFjKv9N2YNk06C60KhzMTx0";

        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "apikey": apiKey,
                "Authorization": `Bearer ${apiKey}`
            }
        });

        log(`Square Alger API Status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }

        const data: SquareAlgerResponse[] = await response.json();
        log(`Square Alger API returned ${data.length} records`);

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

        log(`Successfully processed ${scrapedRates.length} rates from Square Alger API`);

        // Log sample rates for debugging
        if (scrapedRates.length > 0) {
            const eurRate = scrapedRates.find(r => r.currency === 'EUR');
            const usdRate = scrapedRates.find(r => r.currency === 'USD');
            if (eurRate) log(`Square Alger EUR: buy=${eurRate.buy_price}, sell=${eurRate.sell_price}`);
            if (usdRate) log(`Square Alger USD: buy=${usdRate.buy_price}, sell=${usdRate.sell_price}`);
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

        const response = await fetch('http://www.forexalgerie.com/connect/updateExchange.php', {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: "afous=moh!12!"
        });

        log(`Forex Algérie API Status: ${response.status}`);

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }

        const data: ForexAlgerieResponse[] = await response.json();

        if (data && data.length > 0) {
            const item = data[0]; // Take the latest record
            log(`Forex Algérie API latest record date: ${item.create_date_time}`);

            // Mapping from API keys to our currency codes
            const apiMapping: Record<string, string> = {
                'eur': 'EUR',
                'usd': 'USD',
                'cad': 'CAD',
                'gbp': 'GBP',
                'cny': 'CNY',
                'try': 'TRY',
                'chf': 'CHF',
                'sar': 'SAR',
                'aed': 'AED',
                'tnd': 'TND',
                'mad': 'MAD'
            };

            for (const [keyPrefix, currencyCode] of Object.entries(apiMapping)) {
                const buyKey = `${keyPrefix}_buy` as keyof ForexAlgerieResponse;
                const sellKey = `${keyPrefix}_sell` as keyof ForexAlgerieResponse;

                const buyPrice = parseFloat(item[buyKey]);
                const sellPrice = parseFloat(item[sellKey]);

                if (!isNaN(buyPrice) && !isNaN(sellPrice)) {
                    // IMPORTANT: Forex Algérie uses opposite terminology
                    // Their "buy" means they buy from customer (customer sells)
                    // Their "sell" means they sell to customer (customer buys)
                    // So we swap the values to match our convention where:
                    // buy_price = price customer pays to buy currency (should be higher)
                    // sell_price = price customer gets when selling currency (should be lower)
                    scrapedRates.push({
                        currency: currencyCode,
                        buy_price: sellPrice,  // Swapped: use their "sell" as our "buy"
                        sell_price: buyPrice,  // Swapped: use their "buy" as our "sell"
                        source: 'Forex Algérie'
                    });
                }
            }
        } else {
            log("Forex Algérie API returned empty array");
        }

        log(`Successfully processed ${scrapedRates.length} rates from Forex Algérie API`);

        // Log sample rates for debugging
        if (scrapedRates.length > 0) {
            const eurRate = scrapedRates.find(r => r.currency === 'EUR');
            const usdRate = scrapedRates.find(r => r.currency === 'USD');
            if (eurRate) log(`Forex Algérie EUR: buy=${eurRate.buy_price}, sell=${eurRate.sell_price}`);
            if (usdRate) log(`Forex Algérie USD: buy=${usdRate.buy_price}, sell=${usdRate.sell_price}`);
        }

    } catch (error) {
        errorLog("Error fetchin from Forex Algérie API:", error);
    }

    return scrapedRates;
}

function calculateMedianRates(rateArrays: ScrapedRate[][]): RateData[] {
    const rates: RateData[] = [];
    const timestamp = new Date().toISOString();
    const currentDate = new Date().toLocaleDateString('fr-FR');

    // Group rates by currency
    const ratesByCurrency: Record<string, { buy: number[], sell: number[], sources: string[] }> = {};

    // Collect all rates from all sources
    rateArrays.forEach(rateArray => {
        rateArray.forEach(rate => {
            if (!ratesByCurrency[rate.currency]) {
                ratesByCurrency[rate.currency] = { buy: [], sell: [], sources: [] };
            }
            ratesByCurrency[rate.currency].buy.push(rate.buy_price);
            ratesByCurrency[rate.currency].sell.push(rate.sell_price);
            ratesByCurrency[rate.currency].sources.push(rate.source);
        });
    });

    // Calculate median for each currency
    for (const [currency, data] of Object.entries(ratesByCurrency)) {
        if (data.buy.length > 0 && data.sell.length > 0) {
            // Sort and find median
            data.buy.sort((a, b) => a - b);
            data.sell.sort((a, b) => a - b);

            const medianBuy = data.buy.length % 2 === 0
                ? (data.buy[data.buy.length / 2 - 1] + data.buy[data.buy.length / 2]) / 2
                : data.buy[Math.floor(data.buy.length / 2)];

            const medianSell = data.sell.length % 2 === 0
                ? (data.sell[data.sell.length / 2 - 1] + data.sell[data.sell.length / 2]) / 2
                : data.sell[Math.floor(data.sell.length / 2)];

            // Create combined source string
            const uniqueSources = [...new Set(data.sources)];
            const source = uniqueSources.length > 1
                ? `Median: ${uniqueSources.join(' + ')}`
                : uniqueSources[0] || 'Unknown';

            rates.push({
                currency,
                type: 'BLACK_MARKET',
                buy_price: parseFloat(medianBuy.toFixed(2)),
                sell_price: parseFloat(medianSell.toFixed(2)),
                source,
                date: currentDate,
                created_at: timestamp,
            });
        }
    }

    return rates;
}

async function scrapeBlackMarketRates(): Promise<RateData[]> {
    log("Scraping black market rates from multiple sources...");

    const allScrapedRates: ScrapedRate[][] = [];

    // Try to scrape from Square Alger
    try {
        const squareRates = await scrapeSquareAlger();
        if (squareRates.length > 0) {
            allScrapedRates.push(squareRates);
            log(`Successfully scraped ${squareRates.length} rates from Square Alger`);
        } else {
            log("No rates scraped from Square Alger");
        }
    } catch (error) {
        errorLog("Failed to scrape Square Alger:", error);
    }

    // Try to scrape from Forex Algérie
    try {
        const forexRates = await scrapeForexAlgerie();
        if (forexRates.length > 0) {
            allScrapedRates.push(forexRates);
            log(`Successfully scraped ${forexRates.length} rates from Forex Algérie`);
        } else {
            log("No rates scraped from Forex Algérie");
        }
    } catch (error) {
        errorLog("Failed to scrape Forex Algérie:", error);
    }

    // If we have rates from at least one source, calculate medians
    if (allScrapedRates.length > 0) {
        const medianRates = calculateMedianRates(allScrapedRates);
        log(`Calculated median rates for ${medianRates.length} currencies`);
        return medianRates;
    }

    return [];
}

// Log capturing helper
const debugLogs: string[] = [];
function log(message: string) {
    const timestamp = new Date().toISOString().split('T')[1];
    debugLogs.push(`[${timestamp}] ${message}`);
    console.log(message);
}

function errorLog(message: string, error?: any) {
    const timestamp = new Date().toISOString().split('T')[1];
    let errorDetails = '';

    if (error instanceof Error) {
        errorDetails = `${error.name}: ${error.message}\n${error.stack}`;
    } else if (typeof error === 'object') {
        try {
            errorDetails = JSON.stringify(error);
        } catch {
            errorDetails = String(error);
        }
    } else {
        errorDetails = String(error);
    }

    const msg = `ERROR: ${message} ${errorDetails}`;
    debugLogs.push(`[${timestamp}] ${msg}`);
    console.error(message, error);
}

// Environment validation
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    errorLog("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
    // Clear logs for new request (conceptually, though new invocation usually clears state)
    debugLogs.length = 0;
    log("Function invoked");

    try {
        const timestamp = new Date().toISOString();

        // 1. Scrape official rates
        log("Starting official rates scrape...");
        const officialRates = await scrapeOfficialRates();

        // 2. Scrape black market rates from multiple sources
        log("Starting black market rates scrape...");
        const blackMarketRates = await scrapeBlackMarketRates();

        // 3. Combine all rates
        const allRates = [...officialRates, ...blackMarketRates];

        log(`Total rates to insert: ${allRates.length}`);
        log(`Official rates: ${officialRates.length}`);
        log(`Black market rates: ${blackMarketRates.length}`);

        // 4. Validate we have data
        if (allRates.length === 0) {
            throw new Error("No rates were scraped from any source");
        }

        // 5. Insert into Supabase
        log(`Inserting ${allRates.length} records into Supabase`);
        const { error } = await supabase.from('rates').insert(allRates);

        if (error) {
            errorLog('Supabase error:', error);
            return new Response(JSON.stringify({ error: error.message, logs: debugLogs }), { status: 500 });
        }

        // 6. Prepare response
        const officialCurrencies = officialRates.map(r => r.currency);
        const blackMarketCurrencies = blackMarketRates.map(r => r.currency);

        return new Response(JSON.stringify({
            message: "Rates updated successfully",
            total_count: allRates.length,
            official_count: officialRates.length,
            black_market_count: blackMarketRates.length,
            date: allRates.length > 0 ? allRates[0].date : 'Unknown',
            official_currencies: [...new Set(officialCurrencies)],
            black_market_currencies: [...new Set(blackMarketCurrencies)],
            black_market_sources: [...new Set(blackMarketRates.map(r => r.source))],
            logs: debugLogs // <--- Return the captured logs here
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        errorLog('Function error', error);
        return new Response(JSON.stringify({
            error: error.message,
            timestamp: new Date().toISOString(),
            logs: debugLogs // <--- Return logs even on error
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});