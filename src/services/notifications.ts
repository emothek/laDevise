import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PriceAlert } from './alerts';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,  // iOS
        shouldShowList: true,    // iOS
    }),
});

/**
 * Request notification permissions from the user
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('rate-alerts', {
            name: 'Rate Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4F46E5',
            sound: 'default',
        });
    }

    return true;
};

/**
 * Send a local notification for a triggered alert
 */
export const sendAlertNotification = async (alert: PriceAlert, currentRate: number) => {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
        console.warn('Cannot send notification: permissions not granted');
        return;
    }

    const title = `${alert.currency} Alert Triggered! 🔔`;
    let body = '';

    if (alert.alert_type === 'FIXED') {
        const direction = alert.comparison === 'ABOVE' ? 'above' : 'below';
        body = `${alert.currency} is now ${direction} ${alert.threshold_value} DZD (Current: ${currentRate.toFixed(2)} DZD)`;
    } else {
        body = `${alert.currency} has changed significantly! Current rate: ${currentRate.toFixed(2)} DZD`;
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data: {
                alertId: alert.id,
                currency: alert.currency,
                currentRate,
            },
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Send immediately
    });
};

/**
 * Schedule a background task to check alerts periodically
 * Note: This requires expo-task-manager and expo-background-fetch
 * For now, we'll use a simpler approach with app foreground checks
 */
export const setupNotificationListeners = () => {
    // Listen for notification responses (when user taps notification)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const { alertId, currency } = response.notification.request.content.data;
        console.log('Notification tapped:', { alertId, currency });
        // You can navigate to a specific screen here if needed
    });

    return subscription;
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};

/**
 * Get notification permission status
 */
export const getNotificationStatus = async (): Promise<'granted' | 'denied' | 'undetermined'> => {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
};
