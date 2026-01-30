import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { checkAlerts } from '../src/services/alerts';
import { requestNotificationPermissions, sendAlertNotification, setupNotificationListeners } from '../src/services/notifications';
import { fetchRates } from '../src/services/rates';

/**
 * Monitor alerts and check them periodically
 * This hook runs in the background and checks alerts when the app is active
 * Now with full push notification support!
 */
export function useAlertMonitor() {
    const appState = useRef(AppState.currentState);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const notificationListenerRef = useRef<any>(null);

    const checkAlertsNow = async () => {
        try {
            // Fetch current exchange rates
            const rates = await fetchRates();
            const blackMarketRates = rates
                .filter(r => r.type === 'BLACK_MARKET')
                .map(r => ({ currency: r.currency, sell_price: r.sell_price }));

            // Check which alerts should trigger
            const triggered = await checkAlerts(blackMarketRates);

            if (triggered.length > 0) {
                console.log(`✅ Triggered ${triggered.length} alert(s)`);

                // Send push notification for each triggered alert
                for (const alert of triggered) {
                    const rate = blackMarketRates.find(r => r.currency === alert.currency);
                    if (rate) {
                        await sendAlertNotification(alert, rate.sell_price);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Alert check failed:', error);
        }
    };

    const startMonitoring = () => {
        // Clear any existing interval
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // Check immediately
        checkAlertsNow();

        // Check every 5 minutes (300000ms) when app is active
        intervalRef.current = setInterval(checkAlertsNow, 5 * 60 * 1000);
    };

    const stopMonitoring = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    useEffect(() => {
        // Request notification permissions on mount
        requestNotificationPermissions().then(granted => {
            if (granted) {
                console.log('✅ Notification permissions granted');
            } else {
                console.warn('⚠️ Notification permissions denied');
            }
        });

        // Setup notification listeners
        notificationListenerRef.current = setupNotificationListeners();

        // Handle app state changes
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // App came to foreground - check alerts immediately
                console.log('📱 App foregrounded - checking alerts');
                checkAlertsNow();
            }

            if (nextAppState === 'active') {
                startMonitoring();
            } else {
                stopMonitoring();
            }

            appState.current = nextAppState;
        });

        // Start monitoring if app is currently active
        if (AppState.currentState === 'active') {
            startMonitoring();
        }

        // Cleanup
        return () => {
            subscription.remove();
            stopMonitoring();
            if (notificationListenerRef.current) {
                notificationListenerRef.current.remove();
            }
        };
    }, []);

    return {
        checkAlertsNow, // Expose for manual triggering if needed
    };
}
