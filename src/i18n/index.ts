import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const LANGUAGE_KEY = '@app_language';

// Get stored language or default to French
const getStoredLanguage = async () => {
    try {
        const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
        return stored || 'fr'; // Default to French
    } catch {
        return 'fr';
    }
};

// Save language preference
export const setLanguage = async (lang: string) => {
    try {
        await AsyncStorage.setItem(LANGUAGE_KEY, lang);
        await i18n.changeLanguage(lang);
    } catch (error) {
        console.error('Error saving language:', error);
    }
};

// Initialize i18n
export const initI18n = async () => {
    const storedLanguage = await getStoredLanguage();

    i18n
        .use(initReactI18next)
        .init({
            compatibilityJSON: 'v4',
            resources: {
                en: { translation: en },
                fr: { translation: fr },
                ar: { translation: ar },
            },
            lng: storedLanguage,
            fallbackLng: 'fr',
            interpolation: {
                escapeValue: false,
            },
        });
};

export default i18n;
