import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { ExchangeRate, fetchRates } from '@/services/rates';
import { AnalyticsEvents, trackAnalyticsEvent } from '@/src/lib/aptabase';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import React, { useMemo, useState } from 'react'; // useEffect is removed as it's not directly used for initial load anymore
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface UserAsset {
    id: string;
    currency: string;
    amount: number;
    label: string;
}

const SUPPORTED_CURRENCIES = ['DZD', 'EUR', 'USD', 'CAD', 'GBP', 'CHF', 'CNY', 'SAR', 'AED', 'TRY'];

export default function WalletScreen() {
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const colorScheme = useColorScheme();
    const queryClient = useQueryClient();

    // New Asset Form State
    const [newAssetCurrency, setNewAssetCurrency] = useState('EUR');
    const [newAssetAmount, setNewAssetAmount] = useState('');
    const [newAssetLabel, setNewAssetLabel] = useState('');

    const [user, setUser] = useState<any>(null);

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                queryClient.invalidateQueries({ queryKey: ['user_assets'] });
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const { data: rates } = useQuery<ExchangeRate[]>({
        queryKey: ['rates'],
        queryFn: fetchRates,
    });

    const { data: assets, isLoading: isLoadingAssets } = useQuery<UserAsset[]>({
        queryKey: ['user_assets', user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('user_assets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!user,
    });

    const addAssetMutation = useMutation({
        mutationFn: async (newAsset: { currency: string; amount: number; label: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not logged in");

            const { error } = await supabase.from('user_assets').insert({
                user_id: user.id,
                currency: newAsset.currency,
                amount: newAsset.amount,
                label: newAsset.label || 'Wallet' // Default label
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user_assets'] });
            setIsAdding(false);
            setNewAssetAmount('');
            setNewAssetLabel('');
            trackAnalyticsEvent(AnalyticsEvents.ASSET_ADDED, { currency: newAssetCurrency });
        },
        onError: (error) => {
            Alert.alert("Error", error.message);
        }
    });

    const deleteAssetMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('user_assets').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user_assets'] });
            trackAnalyticsEvent(AnalyticsEvents.ASSET_DELETED);
        }
    });

    const totals = useMemo(() => {
        let officialTotal = 0;
        let parallelTotal = 0;

        if (!rates || !assets) return { official: 0, parallel: 0 };

        assets.forEach(asset => {
            if (asset.currency === 'DZD') {
                officialTotal += asset.amount;
                parallelTotal += asset.amount;
                return;
            }

            const officialRate = rates.find(r => r.currency === asset.currency && r.type === 'OFFICIAL');
            const parallelRate = rates.find(r => r.currency === asset.currency && r.type === 'BLACK_MARKET');

            if (officialRate) {
                officialTotal += asset.amount * officialRate.buy_price;
            }

            if (parallelRate) {
                parallelTotal += asset.amount * parallelRate.buy_price;
            } else if (officialRate) {
                parallelTotal += asset.amount * officialRate.buy_price;
            }
        });

        return { official: officialTotal, parallel: parallelTotal };
    }, [assets, rates]);

    const handleAddAsset = () => {
        const amount = parseFloat(newAssetAmount.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            Alert.alert(t('common.error'), t('wallet.invalidAmount'));
            return;
        }
        addAssetMutation.mutate({
            currency: newAssetCurrency,
            amount,
            label: newAssetLabel
        });
    };

    // Auth Guard View
    if (!user) {
        return (
            <View style={[styles.container, { justifyContent: 'center', padding: 20 }]}>
                <Ionicons name="wallet-outline" size={80} color={Colors[colorScheme ?? 'light'].tint} style={{ alignSelf: 'center', marginBottom: 20 }} />
                <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 }}>{t('wallet.title')}</Text>
                <Text style={{ textAlign: 'center', marginBottom: 30, opacity: 0.7, fontSize: 16 }}>
                    {t('wallet.signInPrompt')}
                </Text>

                <Link href="/login" asChild>
                    <TouchableOpacity style={[styles.saveButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
                        <Text style={styles.saveButtonText}>{t('wallet.signInButton')}</Text>
                    </TouchableOpacity>
                </Link>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Summary Card */}
                <View style={[styles.card, { backgroundColor: '#2f95dc' }]}>
                    <Text style={styles.cardTitle}>Total Wealth Estimate</Text>

                    <View style={[styles.totalRow, { backgroundColor: 'transparent' }]}>
                        <Text style={styles.totalLabel}>Parallel Market</Text>
                        <Text style={styles.totalValue}>{totals.parallel.toLocaleString(undefined, { maximumFractionDigits: 0 })} DZD</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={[styles.totalRow, { backgroundColor: 'transparent' }]}>
                        <Text style={styles.totalLabel}>Official Bank</Text>
                        <Text style={styles.totalValue}>{totals.official.toLocaleString(undefined, { maximumFractionDigits: 0 })} DZD</Text>
                    </View>
                </View>

                {/* Assets List */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>My Assets</Text>
                    <TouchableOpacity onPress={() => setIsAdding(true)}>
                        <Ionicons name="add-circle" size={32} color={Colors[colorScheme ?? 'light'].tint} />
                    </TouchableOpacity>
                </View>

                {isLoadingAssets ? (
                    <ActivityIndicator />
                ) : (assets && assets.length > 0) ? (
                    assets.map((asset) => (
                        <View key={asset.id} style={[styles.assetItem, { borderBottomColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                            <View style={styles.assetInfo}>
                                <Text style={styles.assetLabel}>{asset.label || 'Wallet'}</Text>
                                <Text style={styles.assetCurrency}>{asset.currency}</Text>
                            </View>
                            <View style={styles.assetRight}>
                                <Text style={styles.assetAmount}>{asset.amount.toLocaleString()}</Text>
                                <TouchableOpacity onPress={() =>
                                    Alert.alert("Delete Asset", "Are you sure?", [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Delete", style: "destructive", onPress: () => deleteAssetMutation.mutate(asset.id) }
                                    ])
                                }>
                                    <Ionicons name="trash-outline" size={20} color="#e74c3c" style={{ marginLeft: 10 }} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={{ textAlign: 'center', opacity: 0.5, marginTop: 20 }}>No assets added yet.</Text>
                )}

            </ScrollView>

            {/* Add Asset Modal */}
            <Modal visible={isAdding} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                    <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
                        <Text style={styles.modalTitle}>Add New Asset</Text>

                        <Text style={styles.inputLabel}>Label (e.g. Cash, Wise, Bank)</Text>
                        <TextInput
                            style={[styles.modalInput, { color: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
                            placeholder="My Wallet"
                            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                            value={newAssetLabel}
                            onChangeText={setNewAssetLabel}
                        />

                        <Text style={styles.inputLabel}>Currency</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencySelector}>
                            {SUPPORTED_CURRENCIES.map(curr => (
                                <TouchableOpacity
                                    key={curr}
                                    style={[
                                        styles.currencyChip,
                                        newAssetCurrency === curr && { backgroundColor: Colors[colorScheme ?? 'light'].tint }
                                    ]}
                                    onPress={() => setNewAssetCurrency(curr)}
                                >
                                    <Text style={[
                                        styles.currencyChipText,
                                        newAssetCurrency === curr ? { color: 'white' } : { color: Colors[colorScheme ?? 'light'].text }
                                    ]}>{curr}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.inputLabel}>Amount</Text>
                        <TextInput
                            style={[styles.modalInput, { color: Colors[colorScheme ?? 'light'].text, borderColor: Colors[colorScheme ?? 'light'].tabIconDefault }]}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
                            value={newAssetAmount}
                            onChangeText={setNewAssetAmount}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setIsAdding(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]} onPress={handleAddAsset}>
                                <Text style={styles.saveButtonText}>Save Asset</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    cardTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        opacity: 0.9,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    totalLabel: {
        color: 'white',
        fontSize: 14,
        opacity: 0.8,
    },
    totalValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    assetItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    assetInfo: {
        flex: 1,
    },
    assetLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    assetCurrency: {
        fontSize: 12,
        opacity: 0.6,
        fontWeight: 'bold',
    },
    assetRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    assetAmount: {
        fontSize: 18,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        opacity: 0.7,
    },
    modalInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 20,
    },
    currencySelector: {
        flexDirection: 'row',
        marginBottom: 20,
        height: 40,
    },
    currencyChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        marginRight: 8,
        justifyContent: 'center',
    },
    currencyChipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#f1f1f1',
        alignItems: 'center',
    },
    cancelButtonText: {
        fontWeight: '600',
        color: '#333',
    },
    saveButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        fontWeight: '600',
        color: 'white',
    },
});
