import { useColorScheme } from '@/components/useColorScheme';
import { createOffer, createRequest, deleteOffer, fetchActiveOffers, fetchIncomingRequests, MarketOffer, updateOffer } from '@/services/market';
import { ALGERIAN_WILAYAS, SUPPORTED_CURRENCIES } from '@/src/constants/Data';
import { supabase } from '@/src/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function MarketScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const queryClient = useQueryClient();

    // UI State
    const [modalVisible, setModalVisible] = useState(false);
    const [showWilayaPicker, setShowWilayaPicker] = useState(false);
    const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

    // Filters
    const [filterType, setFilterType] = useState<'ALL' | 'OFFER' | 'REQUEST'>('ALL');

    // Data Fetching
    const { data: offers, isLoading, refetch, error } = useQuery({
        queryKey: ['market_offers'],
        queryFn: fetchActiveOffers,
    });

    const { data: incomingRequests } = useQuery({
        queryKey: ['incoming_requests'],
        queryFn: fetchIncomingRequests,
    });

    const pendingCount = incomingRequests?.filter(r => r.status === 'PENDING').length || 0;

    // Form State
    const [form, setForm] = useState<Partial<MarketOffer>>({
        type: 'OFFER',
        currency_from: 'EUR',
        currency_to: 'DZD',
        amount: 100,
        rate: 240,
        payment_methods: ['Cash'],
        wilaya: 'Algiers',
        status: 'ACTIVE',
        contact_preference: 'email',
        phone_number: ''
    });

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Auth Effect
    React.useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setCurrentUserId(data.user?.id || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentUserId(session?.user?.id || null);
            queryClient.invalidateQueries({ queryKey: ['market_offers'] });
            queryClient.invalidateQueries({ queryKey: ['incoming_requests'] });
        });

        return () => subscription.unsubscribe();
    }, []);

    // Mutations
    const createMutation = useMutation({
        mutationFn: createOffer,
        onSuccess: () => {
            setModalVisible(false);
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['market_offers'] });
        },
        onError: (err) => {
            alert(t('market.errorCreating') + ": " + err.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: Partial<MarketOffer> }) => updateOffer(id, updates),
        onSuccess: () => {
            setModalVisible(false);
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['market_offers'] });
            Alert.alert(t('common.success'), t('market.offerUpdated'));
        },
        onError: (err) => alert(t('market.errorUpdating') + ": " + err.message)
    });

    const deleteMutation = useMutation({
        mutationFn: deleteOffer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['market_offers'] });
            Alert.alert(t('common.success'), t('market.offerDeleted'));
        },
        onError: (err) => alert(t('market.errorDeleting') + ": " + err.message)
    });

    const handleDelete = (id: string) => {
        Alert.alert(t('market.delete'), "Are you sure?", [
            { text: t('market.cancel') },
            { text: t('market.delete'), style: "destructive", onPress: () => deleteMutation.mutate(id) }
        ]);
    };

    const handleEdit = (offer: MarketOffer) => {
        setForm(offer);
        setModalVisible(true);
    };

    const resetForm = () => {
        setForm({
            type: 'OFFER',
            currency_from: 'EUR',
            currency_to: 'DZD',
            amount: 100,
            rate: 240,
            payment_methods: ['Cash'],
            wilaya: 'Algiers',
            status: 'ACTIVE',
            contact_preference: 'email',
            phone_number: ''
        });
    };

    const handleSubmit = () => {
        if (form.id) {
            updateMutation.mutate({ id: form.id, updates: form });
        } else {
            createMutation.mutate(form);
        }
    };

    // Proposal Logic
    const [proposalModalVisible, setProposalModalVisible] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState<MarketOffer | null>(null);
    const [proposalForm, setProposalForm] = useState({
        proposed_rate: '',
        proposed_amount: '',
        proposed_location: '',
        payment_method: 'Cash'
    });

    const proposalMutation = useMutation({
        mutationFn: createRequest,
        onSuccess: () => {
            setProposalModalVisible(false);
            Alert.alert(t('common.success'), t('market.proposalSent'));
            setProposalForm({ proposed_rate: '', proposed_amount: '', proposed_location: '', payment_method: 'Cash' });
        },
        onError: (err) => {
            Alert.alert(t('common.error'), t('market.proposalError') + ": " + err.message);
        }
    });

    const handleContactPress = (offer: MarketOffer) => {
        setSelectedOffer(offer);
        setProposalForm({
            proposed_rate: offer.rate?.toString() || '',
            proposed_amount: offer.amount.toString(),
            proposed_location: offer.wilaya || '',
            payment_method: offer.payment_methods[0] || 'Cash'
        });
        setProposalModalVisible(true);
    };

    const submitProposal = () => {
        if (!selectedOffer) return;
        proposalMutation.mutate({
            offer_id: selectedOffer.id,
            proposed_rate: Number(proposalForm.proposed_rate),
            proposed_amount: Number(proposalForm.proposed_amount),
            proposed_location: proposalForm.proposed_location,
            payment_method: proposalForm.payment_method,
            status: 'PENDING'
        });
    };

    const filteredOffers = offers?.filter(o => filterType === 'ALL' || o.type === filterType);

    const renderItem = ({ item }: { item: MarketOffer }) => (
        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            <View style={styles.cardHeader}>
                <View style={[styles.badge, item.type === 'OFFER' ? styles.badgeOffer : styles.badgeRequest]}>
                    <Text style={styles.badgeText}>{item.type === 'OFFER' ? t('market.sell') : t('market.buy')}</Text>
                </View>
                <Text style={[styles.date, { color: isDark ? '#ccc' : '#666' }]}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>

            <View style={styles.row}>
                <View>
                    <Text style={[styles.amount, { color: isDark ? '#fff' : '#000' }]}>
                        {item.amount} {item.currency_from}
                    </Text>
                    <Text style={[styles.rate, { color: isDark ? '#aaa' : '#555' }]}>
                        @ {item.rate} {item.currency_to}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.user, { color: isDark ? '#fff' : '#000' }]}>
                        {item.user_id === currentUserId ? t('market.you') : (item.user_profile?.email || 'User')}
                    </Text>
                    <Text style={[styles.location, { color: isDark ? '#ccc' : '#666' }]}>
                        {item.wilaya}
                    </Text>
                </View>
            </View>

            {item.user_id === currentUserId ? (
                <View style={{ gap: 10 }}>
                    <TouchableOpacity
                        style={[
                            styles.proposalBtn,
                            { backgroundColor: isDark ? '#333' : '#e8f4f8', opacity: (item.requests_count || 0) > 0 ? 1 : 0.6 }
                        ]}
                        onPress={() => (item.requests_count || 0) > 0 && router.push({
                            pathname: "/market/requests",
                            params: {
                                offerId: item.id,
                                contextAmount: item.amount,
                                contextCurrency: item.currency_from,
                                contextType: item.type
                            }
                        })}
                        disabled={(item.requests_count || 0) === 0}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <FontAwesome name="inbox" size={16} color={(item.requests_count || 0) > 0 ? '#3498db' : '#95a5a6'} />
                            <Text style={{ color: (item.requests_count || 0) > 0 ? '#3498db' : '#95a5a6', fontWeight: 'bold' }}>
                                {item.requests_count || 0} {item.type === 'OFFER' ? t('market.incomingRequests') : t('market.incomingOffers')}
                            </Text>
                            {(item.requests_count || 0) > 0 && <FontAwesome name="chevron-right" size={12} color="#3498db" />}
                        </View>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#f39c12', flex: 1, opacity: updateMutation.isPending ? 0.5 : 1 }]}
                            onPress={() => handleEdit(item)}
                            disabled={updateMutation.isPending}
                        >
                            <FontAwesome name="pencil" size={16} color="#fff" />
                            <Text style={styles.btnText}> {t('market.edit')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#e74c3c', flex: 1, opacity: deleteMutation.isPending ? 0.5 : 1 }]}
                            onPress={() => handleDelete(item.id)}
                            disabled={deleteMutation.isPending}
                        >
                            <FontAwesome name="trash" size={16} color="#fff" />
                            <Text style={styles.btnText}> {t('market.delete')}</Text>
                        </TouchableOpacity>
                    </View>
                    {item.status === 'ACTIVE' && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#2ecc71', opacity: updateMutation.isPending ? 0.5 : 1 }]}
                            onPress={() => {
                                Alert.alert(t('market.markSold'), t('market.confirmSold'), [
                                    { text: t('market.cancel') },
                                    { text: t('market.markSold'), onPress: () => updateMutation.mutate({ id: item.id, updates: { status: 'COMPLETED' } }) }
                                ]);
                            }}
                            disabled={updateMutation.isPending}
                        >
                            <FontAwesome name="check" size={16} color="#fff" />
                            <Text style={styles.btnText}> {updateMutation.isPending ? "..." : t('market.markSold')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <TouchableOpacity style={styles.contactBtn} onPress={() => handleContactPress(item)}>
                    <Text style={styles.contactBtnText}>{t('market.contact')}</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f4' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
                <View style={styles.filterBar}>
                    {['ALL', 'OFFER', 'REQUEST'].map((tVal) => (
                        <TouchableOpacity
                            key={tVal}
                            style={[styles.filterChip, filterType === tVal && styles.activeChip]}
                            onPress={() => setFilterType(tVal as any)}
                        >
                            <Text style={[styles.chipText, filterType === tVal && styles.activeChipText]}>
                                {tVal === 'OFFER' ? t('market.sell') : tVal === 'REQUEST' ? t('market.buy') : t('market.all')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Link href="/market/requests" asChild>
                    <TouchableOpacity style={styles.inboxBtn}>
                        <FontAwesome name="envelope" size={20} color={isDark ? '#fff' : '#333'} />
                        {pendingCount > 0 && (
                            <View style={styles.badgeCount}>
                                <Text style={styles.badgeCountText}>{pendingCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </Link>
            </View>

            <FlatList
                data={filteredOffers}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshing={isLoading}
                onRefresh={refetch}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 20 }}>
                        <Text style={{ color: '#888', marginBottom: 10 }}>
                            {error ? `Error: ${(error as Error).message}` : t('market.noOffers')}
                        </Text>
                        {error && (
                            <TouchableOpacity onPress={() => refetch()} style={{ padding: 10, backgroundColor: '#3498db', borderRadius: 8 }}>
                                <Text style={{ color: '#fff' }}>{t('market.retry')}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <FontAwesome name="plus" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Create Offer Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {form.id ? t('market.editOfferTitle') : t('market.createOfferTitle')}
                        </Text>

                        <View style={{ gap: 12 }}>
                            {/* Type Selector */}
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.typeBtn, form.type === 'OFFER' && styles.activeTypeBtn]}
                                    onPress={() => setForm({ ...form, type: 'OFFER' })}
                                >
                                    <Text style={styles.typeBtnText}>{t('market.sellCurrency')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeBtn, form.type === 'REQUEST' && styles.activeTypeBtn, form.type === 'REQUEST' && { backgroundColor: '#e67e22' }]}
                                    onPress={() => setForm({ ...form, type: 'REQUEST' })}
                                >
                                    <Text style={styles.typeBtnText}>{t('market.buyCurrency')}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Currency Selector */}
                            <TouchableOpacity
                                style={[styles.input, { borderColor: isDark ? '#333' : '#ccc', flexDirection: 'row', justifyContent: 'space-between' }]}
                                onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
                            >
                                <Text style={{ color: isDark ? '#fff' : '#000' }}>{form.currency_from}</Text>
                                <FontAwesome name="chevron-down" color={isDark ? '#fff' : '#666'} />
                            </TouchableOpacity>

                            {showCurrencyPicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: isDark ? '#2c2c2e' : '#eee' }]}>
                                    <ScrollView style={{ maxHeight: 100 }}>
                                        {SUPPORTED_CURRENCIES.map(curr => (
                                            <TouchableOpacity
                                                key={curr}
                                                style={styles.pickerItem}
                                                onPress={() => { setForm({ ...form, currency_from: curr }); setShowCurrencyPicker(false); }}
                                            >
                                                <Text style={{ color: isDark ? '#fff' : '#000' }}>{curr}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TextInput
                                    placeholder={t('market.amount')}
                                    placeholderTextColor="#999"
                                    style={[styles.input, { flex: 1, color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ccc' }]}
                                    keyboardType="numeric"
                                    onChangeText={t => setForm({ ...form, amount: Number(t) })}
                                    value={form.amount?.toString()}
                                />
                                <TextInput
                                    placeholder={t('market.rate')}
                                    placeholderTextColor="#999"
                                    style={[styles.input, { flex: 1, color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ccc' }]}
                                    keyboardType="numeric"
                                    onChangeText={t => setForm({ ...form, rate: Number(t) })}
                                    value={form.rate?.toString()}
                                />
                            </View>

                            {/* Wilaya Selector */}
                            <TouchableOpacity
                                style={[styles.input, { borderColor: isDark ? '#333' : '#ccc', flexDirection: 'row', justifyContent: 'space-between' }]}
                                onPress={() => setShowWilayaPicker(!showWilayaPicker)}
                            >
                                <Text style={{ color: isDark ? '#fff' : '#000' }}>{form.wilaya || t('market.wilaya')}</Text>
                                <FontAwesome name="chevron-down" color={isDark ? '#fff' : '#666'} />
                            </TouchableOpacity>

                            {showWilayaPicker && (
                                <View style={[styles.pickerContainer, { backgroundColor: isDark ? '#2c2c2e' : '#eee' }]}>
                                    <ScrollView style={{ maxHeight: 150 }}>
                                        {ALGERIAN_WILAYAS.map(w => (
                                            <TouchableOpacity
                                                key={w}
                                                style={styles.pickerItem}
                                                onPress={() => { setForm({ ...form, wilaya: w }); setShowWilayaPicker(false); }}
                                            >
                                                <Text style={{ color: isDark ? '#fff' : '#000' }}>{w}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            <TextInput
                                placeholder={t('market.paymentMethod')}
                                placeholderTextColor="#999"
                                style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ccc' }]}
                                onChangeText={t => setForm({ ...form, payment_methods: [t] })}
                                value={form.payment_methods?.[0] || ''}
                            />

                            {/* Contact Preference */}
                            <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: 'bold', marginTop: 10 }}>{t('market.contactPreference')}</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                {['email', 'phone', 'both'].map((pref) => (
                                    <TouchableOpacity
                                        key={pref}
                                        style={[styles.typeBtn, form.contact_preference === pref && styles.activeTypeBtn]}
                                        onPress={() => setForm({ ...form, contact_preference: pref as any })}
                                    >
                                        <Text style={styles.typeBtnText}>{pref.toUpperCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {(form.contact_preference === 'phone' || form.contact_preference === 'both') && (
                                <TextInput
                                    placeholder={t('market.phonePlaceholder')}
                                    placeholderTextColor="#999"
                                    style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ccc' }]}
                                    keyboardType="phone-pad"
                                    onChangeText={t => setForm({ ...form, phone_number: t })}
                                    value={form.phone_number}
                                />
                            )}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={{ color: '#666' }}>{t('market.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('market.post')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Proposal / Contact Modal */}
            <Modal visible={proposalModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
                        <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>
                            {t('market.proposalTitle')}
                        </Text>
                        <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
                            {selectedOffer?.amount} {selectedOffer?.currency_from}
                        </Text>

                        <View style={{ gap: 12 }}>
                            <TextInput
                                placeholder={t('market.proposedAmount')}
                                placeholderTextColor="#999"
                                style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ccc' }]}
                                keyboardType="numeric"
                                value={proposalForm.proposed_amount}
                                onChangeText={t => setProposalForm({ ...proposalForm, proposed_amount: t })}
                            />
                            <TextInput
                                placeholder={t('market.proposedRate')}
                                placeholderTextColor="#999"
                                style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ccc' }]}
                                keyboardType="numeric"
                                value={proposalForm.proposed_rate}
                                onChangeText={t => setProposalForm({ ...proposalForm, proposed_rate: t })}
                            />
                            <TextInput
                                placeholder={t('market.meetingLocation')}
                                placeholderTextColor="#999"
                                style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ccc' }]}
                                value={proposalForm.proposed_location}
                                onChangeText={t => setProposalForm({ ...proposalForm, proposed_location: t })}
                            />
                            <TextInput
                                placeholder={t('market.paymentMethod')}
                                placeholderTextColor="#999"
                                style={[styles.input, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#333' : '#ccc' }]}
                                value={proposalForm.payment_method}
                                onChangeText={t => setProposalForm({ ...proposalForm, payment_method: t })}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setProposalModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={{ color: '#666' }}>{t('market.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={submitProposal} style={styles.submitBtn}>
                                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('market.sendProposal')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { padding: 16, paddingBottom: 100 },
    filterBar: { flexDirection: 'row', padding: 16, gap: 10 },
    filterChip: { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#ddd' },
    activeChip: { backgroundColor: '#2ecc71' },
    chipText: { fontWeight: '600', color: '#555' },
    activeChipText: { color: '#fff' },

    card: { borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
    cardLight: { backgroundColor: '#fff' },
    cardDark: { backgroundColor: '#1c1c1e' },

    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    badge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4 },
    badgeOffer: { backgroundColor: '#2ecc71' },
    badgeRequest: { backgroundColor: '#e67e22' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    date: { fontSize: 12 },

    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    amount: { fontSize: 18, fontWeight: 'bold' },
    rate: { fontSize: 14 },
    user: { fontSize: 14, fontWeight: '600' },
    location: { fontSize: 12 },

    proposalBtn: { padding: 12, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: 'transparent' },

    contactBtn: { backgroundColor: '#3498db', padding: 10, borderRadius: 8, alignItems: 'center' },
    contactBtnText: { color: '#fff', fontWeight: '600' },

    actionBtn: { padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold' },

    fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2ecc71', justifyContent: 'center', alignItems: 'center', elevation: 5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 16, padding: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { borderWidth: 1, borderRadius: 8, padding: 12 },

    pickerContainer: { borderRadius: 8, padding: 4, marginBottom: 10 },
    pickerItem: { padding: 10, borderBottomWidth: 0.5, borderBottomColor: '#ccc' },

    typeBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#ddd', alignItems: 'center' },
    activeTypeBtn: { backgroundColor: '#2ecc71' },
    typeBtnText: { color: '#fff', fontWeight: 'bold' },

    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 15 },
    cancelBtn: { padding: 10 },
    submitBtn: { backgroundColor: '#2ecc71', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },

    inboxBtn: { padding: 10, borderRadius: 20, backgroundColor: '#ddd', marginLeft: 10, position: 'relative' },
    badgeCount: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    badgeCountText: { color: '#fff', fontSize: 10, fontWeight: 'bold' }
});
