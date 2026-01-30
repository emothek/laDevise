import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { AlertType, Comparison, createAlert } from '@/src/services/alerts';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface CreateAlertModalProps {
    visible: boolean;
    onClose: () => void;
    initialCurrency?: string;
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'CAD', 'CHF', 'CNY', 'AED', 'SAR', 'TRY', 'TND', 'MAD'];

export default function CreateAlertModal({ visible, onClose, initialCurrency }: CreateAlertModalProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const queryClient = useQueryClient();

    const [currency, setCurrency] = useState(initialCurrency || 'EUR');
    const [alertType, setAlertType] = useState<AlertType>('FIXED');
    const [comparison, setComparison] = useState<Comparison>('ABOVE');
    const [thresholdValue, setThresholdValue] = useState('');

    const createMutation = useMutation({
        mutationFn: createAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userAlerts'] });
            resetForm();
            onClose();
        },
        onError: (error) => {
            alert(t('alerts.createError', 'Failed to create alert'));
            console.error('Create alert error:', error);
        }
    });

    const resetForm = () => {
        setCurrency(initialCurrency || 'EUR');
        setAlertType('FIXED');
        setComparison('ABOVE');
        setThresholdValue('');
    };

    const handleCreate = () => {
        const threshold = parseFloat(thresholdValue);
        if (isNaN(threshold) || threshold <= 0) {
            alert(t('alerts.invalidThreshold', 'Please enter a valid threshold'));
            return;
        }

        createMutation.mutate({
            currency,
            alert_type: alertType,
            threshold_value: threshold,
            comparison: alertType === 'FIXED' ? comparison : 'CHANGE',
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff' }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>{t('alerts.createNew', 'Create Alert')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form}>
                        {/* Currency Selector */}
                        <Text style={[styles.label, { color: theme.text }]}>{t('alerts.currency', 'Currency')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
                            {CURRENCIES.map((curr) => (
                                <TouchableOpacity
                                    key={curr}
                                    onPress={() => setCurrency(curr)}
                                    style={[
                                        styles.currencyChip,
                                        currency === curr && { backgroundColor: theme.tint }
                                    ]}
                                >
                                    <Text style={[
                                        styles.currencyChipText,
                                        { color: currency === curr ? 'white' : theme.text }
                                    ]}>
                                        {curr}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Alert Type */}
                        <Text style={[styles.label, { color: theme.text }]}>{t('alerts.type', 'Alert Type')}</Text>
                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                onPress={() => setAlertType('FIXED')}
                                style={[
                                    styles.typeButton,
                                    alertType === 'FIXED' && { backgroundColor: theme.tint }
                                ]}
                            >
                                <Text style={[
                                    styles.typeButtonText,
                                    { color: alertType === 'FIXED' ? 'white' : theme.text }
                                ]}>
                                    {t('alerts.fixedPrice', 'Fixed Price')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setAlertType('VOLATILITY')}
                                style={[
                                    styles.typeButton,
                                    alertType === 'VOLATILITY' && { backgroundColor: theme.tint }
                                ]}
                            >
                                <Text style={[
                                    styles.typeButtonText,
                                    { color: alertType === 'VOLATILITY' ? 'white' : theme.text }
                                ]}>
                                    {t('alerts.volatility', 'Volatility')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Comparison (only for FIXED) */}
                        {alertType === 'FIXED' && (
                            <>
                                <Text style={[styles.label, { color: theme.text }]}>{t('alerts.when', 'When')}</Text>
                                <View style={styles.typeSelector}>
                                    <TouchableOpacity
                                        onPress={() => setComparison('ABOVE')}
                                        style={[
                                            styles.typeButton,
                                            comparison === 'ABOVE' && { backgroundColor: theme.tint }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.typeButtonText,
                                            { color: comparison === 'ABOVE' ? 'white' : theme.text }
                                        ]}>
                                            {t('alerts.above', 'Above')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setComparison('BELOW')}
                                        style={[
                                            styles.typeButton,
                                            comparison === 'BELOW' && { backgroundColor: theme.tint }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.typeButtonText,
                                            { color: comparison === 'BELOW' ? 'white' : theme.text }
                                        ]}>
                                            {t('alerts.below', 'Below')}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        {/* Threshold Value */}
                        <Text style={[styles.label, { color: theme.text }]}>
                            {alertType === 'FIXED' ? t('alerts.price', 'Price (DZD)') : t('alerts.change', 'Change (DZD)')}
                        </Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.text + '30' }]}
                            placeholder={alertType === 'FIXED' ? '250' : '5'}
                            placeholderTextColor={theme.text + '50'}
                            keyboardType="numeric"
                            value={thresholdValue}
                            onChangeText={setThresholdValue}
                        />

                        {/* Create Button */}
                        <TouchableOpacity
                            onPress={handleCreate}
                            style={[styles.createButton, { backgroundColor: theme.tint }]}
                            disabled={createMutation.isPending}
                        >
                            <Text style={styles.createButtonText}>
                                {createMutation.isPending ? t('common.creating', 'Creating...') : t('alerts.create', 'Create Alert')}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    form: {
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    currencyScroll: {
        marginBottom: 8,
    },
    currencyChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    currencyChipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 8,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    typeButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    createButton: {
        marginTop: 24,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    createButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
