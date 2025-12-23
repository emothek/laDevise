import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const [notification, setNotification] = useState<Notifications.Notification | undefined>();
    const notificationListener = useRef<Notifications.Subscription>();
    const responseListener = useRef<Notifications.Subscription>();

    async function registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        // ... imports

        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                alert('Failed to get push token for push notification!');
                return;
            }

            try {
                const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
                if (!projectId) {
                    console.warn("Project ID not found. Push notifications disabled in dev mode.");
                    return;
                }
                token = await Notifications.getExpoPushTokenAsync({
                    projectId,
                });
            } catch (e) {
                console.warn("Error fetching push token:", e);
            }
        } else {
            // alert('Must use physical device for Push Notifications');
        }

        return token?.data;
    }

    const syncTokenToDb = async (token: string) => {
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
                token: token,
                user_id: user?.id ?? null,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'token' });

        if (error) {
            console.error("Error syncing push token to DB:", error);
        }
    };

    useEffect(() => {
        registerForPushNotificationsAsync().then(async token => {
            setExpoPushToken(token);
            if (token) {
                await AsyncStorage.setItem('push_token', token);
                syncTokenToDb(token);
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
            console.log(response);
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    return {
        expoPushToken,
        notification,
    };
}
