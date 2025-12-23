import Aptabase, { trackEvent } from '@aptabase/react-native';

// Initialize Aptabase
// Get your App Key from https://aptabase.com
const APTABASE_APP_KEY = process.env.EXPO_PUBLIC_APTABASE_APP_KEY || '';

export const initAptabase = () => {
    if (APTABASE_APP_KEY) {
        Aptabase.init(APTABASE_APP_KEY);
        console.log('Aptabase initialized');
    } else {
        console.warn('Aptabase App Key not found. Analytics disabled.');
    }
};

// Track custom events
export const trackAnalyticsEvent = (eventName: string, properties?: Record<string, string | number | boolean>) => {
    if (APTABASE_APP_KEY) {
        trackEvent(eventName, properties);
    }
};

// Predefined event names for consistency
export const AnalyticsEvents = {
    // Authentication
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    USER_SIGNUP: 'user_signup',

    // Currency Operations
    CURRENCY_CONVERTED: 'currency_converted',
    RATE_VIEWED: 'rate_viewed',
    FAVORITE_TOGGLED: 'favorite_toggled',

    // Wallet
    ASSET_ADDED: 'asset_added',
    ASSET_DELETED: 'asset_deleted',
    WALLET_VIEWED: 'wallet_viewed',

    // App Usage
    LANGUAGE_CHANGED: 'language_changed',
    SCREEN_VIEWED: 'screen_viewed',
} as const;
