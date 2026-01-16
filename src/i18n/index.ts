import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const resources = {
    en: { translation: en },
    fr: { translation: fr },
    ar: { translation: ar },
};

import AsyncStorage from '@react-native-async-storage/async-storage';

export const LANGUAGE_KEY = 'user-language';

export const initI18n = async () => {
    let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    if (!savedLanguage) {
        savedLanguage = Localization.getLocales()?.[0]?.languageCode ?? 'en';
    }

    await i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: savedLanguage,
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false,
            },
            compatibilityJSON: 'v4' // for android
        });
};

export const setLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export default i18n;
