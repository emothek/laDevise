import { supabase } from '@/lib/supabase';

export type AlertType = 'FIXED' | 'VOLATILITY';
export type Comparison = 'ABOVE' | 'BELOW' | 'CHANGE';

export interface PriceAlert {
    id: string;
    user_id: string;
    currency: string;
    alert_type: AlertType;
    threshold_value: number;
    comparison: Comparison;
    is_active: boolean;
    last_triggered_at: string | null;
    created_at: string;
}

export interface CreateAlertParams {
    currency: string;
    alert_type: AlertType;
    threshold_value: number;
    comparison: Comparison;
}

export const createAlert = async (params: CreateAlertParams): Promise<PriceAlert> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to create alerts");

    const { data, error } = await supabase
        .from('price_alerts')
        .insert({
            user_id: user.id,
            ...params
        } as any)
        .select()
        .single();

    if (error) throw error;
    return data as PriceAlert;
};

export const fetchUserAlerts = async (): Promise<PriceAlert[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('price_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as PriceAlert[]) || [];
};

export const updateAlert = async (id: string, updates: Partial<PriceAlert>) => {
    const { error } = await supabase
        .from('price_alerts')
        .update(updates as any)
        .eq('id', id);

    if (error) throw error;
};

export const deleteAlert = async (id: string) => {
    const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const checkAlerts = async (currentRates: { currency: string; sell_price: number }[]): Promise<PriceAlert[]> => {
    const alerts = await fetchUserAlerts();
    const triggeredAlerts: PriceAlert[] = [];

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const alert of alerts) {
        if (!alert.is_active) continue;

        // Cooldown: Don't trigger if already triggered in last hour
        if (alert.last_triggered_at && new Date(alert.last_triggered_at) > oneHourAgo) {
            continue;
        }

        const rate = currentRates.find(r => r.currency === alert.currency);
        if (!rate) continue;

        let shouldTrigger = false;

        if (alert.alert_type === 'FIXED') {
            if (alert.comparison === 'ABOVE' && rate.sell_price > alert.threshold_value) {
                shouldTrigger = true;
            } else if (alert.comparison === 'BELOW' && rate.sell_price < alert.threshold_value) {
                shouldTrigger = true;
            }
        } else if (alert.alert_type === 'VOLATILITY') {
            // For volatility, we'd need historical data to compare
            // For MVP, we'll skip this or implement a simple version
            // that checks if the change from last known value exceeds threshold
            // This requires storing previous rates, which we'll add later
        }

        if (shouldTrigger) {
            triggeredAlerts.push(alert);
            // Update last_triggered_at
            await updateAlert(alert.id, { last_triggered_at: now.toISOString() });
        }
    }

    return triggeredAlerts;
};
