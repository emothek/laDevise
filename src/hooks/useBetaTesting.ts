import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const BETA_TESTING_KEY = 'beta_testing_start_date';

// Schedule for notifications (days from start)
const NOTIFICATION_SCHEDULE = [1, 3, 7, 10, 14];

export function useBetaTesting() {
    const { t } = useTranslation();

    useEffect(() => {
        checkAndSchedule();
    }, []);

    const checkAndSchedule = async () => {
        try {
            const startDate = await AsyncStorage.getItem(BETA_TESTING_KEY);

            if (!startDate) {
                // First launch!
                const now = new Date();
                await AsyncStorage.setItem(BETA_TESTING_KEY, now.toISOString());
                console.log("Beta testing started at", now.toISOString());

                await scheduleNotifications(now);
            }
        } catch (e) {
            console.error("Error in beta testing hook", e);
        }
    };

    const scheduleNotifications = async (startDate: Date) => {
        // Request permissions first (best effort)
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            if (newStatus !== 'granted') return;
        }

        // Cancel any existing just in case
        await Notifications.cancelAllScheduledNotificationsAsync();

        // Schedule
        for (const dayOffset of NOTIFICATION_SCHEDULE) {
            const triggerDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);

            // Don't schedule in past
            if (triggerDate <= new Date()) continue;

            // Set to a reasonable time, e.g., 10:30 AM
            triggerDate.setHours(10, 30, 0, 0);

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "La Devise Beta",
                    body: t('beta.notificationBody', 'Check the latest exchange rates! Your feedback is valuable.'),
                    data: { type: 'beta_reminder' },
                },
                trigger: {
                    type: 'date',
                    date: triggerDate
                } as any,
            });
            console.log(`Scheduled notification for ${triggerDate.toISOString()}`);
        }
    };
}
