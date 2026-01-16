
import { supabase } from '@/lib/supabase';
import { RateWidget } from '@/src/components/RateWidget';
import React from 'react';
import { requestWidgetUpdate } from 'react-native-android-widget';

export async function widgetTask() {
    try {
        // 1. Fetch latest rates from Supabase
        // We want the LATEST rate for each currency of type BLACK_MARKET
        const { data, error } = await supabase
            .from('rates')
            .select('currency, buy_price, sell_price, type')
            .eq('type', 'BLACK_MARKET')
            .order('created_at', { ascending: false })
            .limit(10); // get enough recent ones

        if (error) {
            console.error('Widget Fetch Error:', error);
            return;
        }

        // Process data to get unique latest per currency
        const ratesMap = new Map();
        (data as any[]).forEach(item => {
            if (!ratesMap.has(item.currency)) {
                ratesMap.set(item.currency, {
                    currency: item.currency,
                    buy: item.buy_price,
                    sell: item.sell_price
                });
            }
        });

        const latestRates = Array.from(ratesMap.values());

        // 2. Render and update
        requestWidgetUpdate({
            widgetName: 'RateWidget',
            renderWidget: () => <RateWidget rates={latestRates} />,
            widgetNotFound: () => {
                // Called if the widget is not installed on the home screen
            }
        });

    } catch (err) {
        console.error('Widget Task failed', err);
    }
}
