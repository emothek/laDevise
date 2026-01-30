import { fetchRates } from '@/services/rates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const STICKY_NOTIFICATION_ID = 'sticky-rates-monitor';
const ENABLED_KEY = 'sticky_rates_enabled';

export function useRateNotification() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]);

    // Fetch rates periodically or rely on global cache
    const { data: rates } = useQuery({
        queryKey: ['rates'],
        queryFn: fetchRates,
        // Using a longer stale time or relying on other components to refresh is fine
        // But for notification accuracy, let's just peek at the data when it changes
    });

    useEffect(() => {
        loadSettings();
    }, []);

    // Load initial settings
    const loadSettings = async () => {
        try {
            const enabledStr = await AsyncStorage.getItem(ENABLED_KEY);
            const favStr = await AsyncStorage.getItem('favorite_currencies');

            // Default to true if not set? Or false. Let's default to false as it's intrusive.
            setIsEnabled(enabledStr === 'true');
            if (favStr) setFavorites(JSON.parse(favStr));
        } catch (e) {
            console.error("Failed to load sticky settings", e);
        }
    };

    // Update notification when rates or favorites change
    useEffect(() => {
        if (isEnabled && rates && favorites.length > 0) {
            updateNotification();
        }
    }, [isEnabled, rates, favorites]);

    // Sync favorites from storage periodically
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const favStr = await AsyncStorage.getItem('favorite_currencies');
                if (favStr) {
                    const newFavs = JSON.parse(favStr);
                    setFavorites(newFavs);
                }
            } catch (e) {
                console.error("Failed to sync favorites", e);
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(interval);
    }, []);

    const toggleSticky = async (value: boolean) => {
        console.log("Toggle sticky called with:", value);
        setIsEnabled(value);
        await AsyncStorage.setItem(ENABLED_KEY, String(value));

        try {
            if (!value) {
                console.log("Canceling notification...");
                await Notifications.cancelScheduledNotificationAsync(STICKY_NOTIFICATION_ID);
                await Notifications.dismissNotificationAsync(STICKY_NOTIFICATION_ID);
            } else {
                console.log("Updating notification...");
                updateNotification();
            }
        } catch (error) {
            console.warn("Notification toggle failed (Expo Go limitation):", error);
        }
    };

    // To verify: we might need to poll for favorites changes if `index.tsx` changes them
    // Ideally we should use a Store or Context for favorites to keep this sync.
    // For MVP, we can listen to the same AsyncStorage key or just rely on re-renders if used in the same tree context effectively.
    // A quick hack is to expose `refreshFavorites` or accept them as props. 
    // BUT `useRateNotification` is likely used in `_layout`?
    // If in `_layout`, it won't see `index.tsx` state changes easily without a store.
    // Let's assume we read from AsyncStorage every few seconds or use an event listener? 
    // React Query for favorites would be better.
    // simpler: Pass favorites as argument if used in index.tsx? 
    // No, user wants it persistent.

    // Let's implement a simple polling for favorites for now or just rely on app focus?
    // Actually, `useRateNotification` should probably update when app is open.
    // Background updates are harder (require BackgroundFetch). 
    // Sticky notification usually implies "while app is running" or "last known state".

    const updateNotification = async () => {
        if (Platform.OS !== 'android') return;

        try {
            // Filter rates - get unique currencies only
            const seenCurrencies = new Set<string>();
            const relevantRates = rates?.filter(r => {
                if (favorites.includes(r.currency) && r.type === 'BLACK_MARKET' && !seenCurrencies.has(r.currency)) {
                    seenCurrencies.add(r.currency);
                    return true;
                }
                return false;
            });

            if (!relevantRates || relevantRates.length === 0) return;

            const body = relevantRates.map(r => `${r.currency}: ${r.sell_price}`).join(' | ');

            // Set notification channel for Android
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('sticky-rates', {
                    name: 'Market Rates',
                    importance: Notifications.AndroidImportance.HIGH,
                    sound: null,
                    vibrationPattern: null,
                    enableVibrate: false,
                });
            }

            await Notifications.scheduleNotificationAsync({
                identifier: STICKY_NOTIFICATION_ID,
                content: {
                    title: 'La Devise',
                    body: body,
                    sticky: true,
                    autoDismiss: false,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    data: { type: 'sticky_rates' },
                },
                trigger: null, // Show immediately
            });
        } catch (error) {
            // Silently fail in Expo Go or if notifications aren't available
            console.warn("Sticky notification not available:", error);
        }
    };

    return {
        isEnabled,
        toggleSticky,
        setFavorites // Allow external component to update favorites list for the hook
    };
}
