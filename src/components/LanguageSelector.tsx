import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { setLanguage } from '../i18n';

const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export default function LanguageSelector() {
    const { i18n } = useTranslation();
    const [modalVisible, setModalVisible] = useState(false);
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'] as typeof Colors.light;

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

    const handleLanguageChange = async (langCode: string) => {
        await setLanguage(langCode);
        setModalVisible(false);
    };

    return (
        <>
            <Pressable onPress={() => setModalVisible(true)} style={styles.button}>
                {({ pressed }) => (
                    <View style={[styles.buttonContent, { opacity: pressed ? 0.5 : 1 }]}>
                        <Text style={styles.flag}>{currentLanguage.flag}</Text>
                        <FontAwesome name="chevron-down" size={12} color={theme.text} />
                    </View>
                )}
            </Pressable>

            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setModalVisible(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        {languages.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.languageOption,
                                    i18n.language === lang.code && { backgroundColor: theme.tint + '20' }
                                ]}
                                onPress={() => handleLanguageChange(lang.code)}
                            >
                                <Text style={styles.flag}>{lang.flag}</Text>
                                <Text style={[styles.languageName, { color: theme.text }]}>
                                    {lang.name}
                                </Text>
                                {i18n.language === lang.code && (
                                    <FontAwesome name="check" size={16} color={theme.tint} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    button: {
        marginRight: 15,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    flag: {
        fontSize: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        borderRadius: 12,
        padding: 8,
        minWidth: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    languageOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 12,
    },
    languageName: {
        fontSize: 16,
        flex: 1,
    },
});
