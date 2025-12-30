import { useColorScheme } from '@/components/useColorScheme';
import { deleteRequest, fetchIncomingRequests, fetchOutgoingRequests, MarketRequest, updateOffer, updateRequestStatus } from '@/services/market';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function RequestsScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const offerId = params.offerId as string;
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState<'INCOMING' | 'OUTGOING'>(offerId ? 'INCOMING' : 'INCOMING');

    const { data: incoming, refetch: refetchIncoming } = useQuery({
        queryKey: ['incoming_requests'],
        queryFn: fetchIncomingRequests,
        enabled: viewMode === 'INCOMING' || !!offerId
    });

    const { data: outgoing, refetch: refetchOutgoing } = useQuery({
        queryKey: ['outgoing_requests'],
        queryFn: fetchOutgoingRequests,
        enabled: viewMode === 'OUTGOING'
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: 'ACCEPTED' | 'REJECTED' }) => updateRequestStatus(id, status),
        onSuccess: () => {
            Alert.alert("Success", "Request status updated.");
            refetchIncoming();
        },
        onError: (err) => alert(err.message)
    });

    const deleteRequestMutation = useMutation({
        mutationFn: deleteRequest,
        onSuccess: () => {
            Alert.alert("Success", "Request cancelled.");
            refetchOutgoing();
        },
        onError: (err) => alert("Error cancelling: " + err.message)
    });

    const handleAction = (id: string, status: 'ACCEPTED' | 'REJECTED') => {
        statusMutation.mutate({ id, status });
    };

    const handleDelete = (id: string) => {
        Alert.alert(t('common.delete'), "Cancel this request?", [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: () => deleteRequestMutation.mutate(id) }
        ]);
    };

    const renderItem = ({ item }: { item: MarketRequest }) => (
        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
                    {item.offer?.type === 'OFFER' ? t('market.sell') : t('market.buy')} {item.offer?.amount} {item.offer?.currency_from}
                </Text>
                <View style={[styles.statusBadge,
                item.status === 'ACCEPTED' ? { backgroundColor: '#2ecc71' } :
                    item.status === 'REJECTED' ? { backgroundColor: '#e74c3c' } : { backgroundColor: '#f39c12' }
                ]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>

            <Text style={{ color: isDark ? '#ccc' : '#666', marginTop: 5 }}>
                Proposal: {item.proposed_amount} @ {item.proposed_rate} in {item.proposed_location}
            </Text>

            {/* Incoming actions: Accept/Reject */}
            {viewMode === 'INCOMING' && item.status === 'PENDING' && (
                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleAction(item.id, 'REJECTED')}>
                        <Text style={styles.btnText}>{t('market.refuse')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.btnAccept]} onPress={() => handleAction(item.id, 'ACCEPTED')}>
                        <Text style={styles.btnText}>{t('market.accept')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Outgoing actions: Cancel */}
            {viewMode === 'OUTGOING' && item.status === 'PENDING' && (
                <View style={styles.actions}>
                    <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleDelete(item.id)}>
                        <Text style={styles.btnText}>{t('common.delete')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {item.status === 'ACCEPTED' && (
                <View style={styles.contactInfo}>
                    <Text style={{ fontWeight: 'bold', color: isDark ? '#fff' : '#000', marginBottom: 5 }}>
                        <FontAwesome name="unlock" size={14} /> {t('market.contactDetails')}
                    </Text>

                    {viewMode === 'INCOMING' ? (
                        <>
                            <Text style={{ color: isDark ? '#ddd' : '#333' }}>📧 {t('market.requesterEmail')}: {item.requester_profile?.email}</Text>
                            {item.requester_profile?.phone && (
                                <Text style={{ color: isDark ? '#ddd' : '#333' }}>📱 {t('market.requesterPhone')}: {item.requester_profile?.phone}</Text>
                            )}

                            <TouchableOpacity
                                style={[styles.btn, { backgroundColor: '#2ecc71', marginTop: 10 }]}
                                onPress={() => {
                                    Alert.alert(t('market.markSold'), "Confirm deal with this user?", [
                                        { text: t('market.cancel') },
                                        {
                                            text: t('market.markSold'),
                                            onPress: () => {
                                                if (item.offer_id) {
                                                    updateOffer(item.offer_id, {
                                                        status: 'COMPLETED',
                                                        settled_request_id: item.id
                                                    })
                                                        .then(() => {
                                                            Alert.alert(t('common.success'), t('market.offerSettled'));
                                                            refetchIncoming();
                                                            queryClient.invalidateQueries({ queryKey: ['market_offers'] });
                                                        })
                                                        .catch(err => Alert.alert("Error", err.message));
                                                }
                                            }
                                        }
                                    ]);
                                }}
                            >
                                <Text style={styles.btnText}>{t('market.markSold')}</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={{ color: isDark ? '#ddd' : '#333' }}>📧 {t('market.ownerEmail')}: {item.offer?.user_profile?.email}</Text>
                            {item.offer?.user_profile?.phone && (
                                <Text style={{ color: isDark ? '#ddd' : '#333' }}>📱 {t('market.ownerPhone')}: {item.offer?.user_profile?.phone}</Text>
                            )}
                        </>
                    )}
                </View>
            )}
        </View>
    );

    let data = viewMode === 'INCOMING' ? incoming : outgoing;

    // Filter by offerId if present
    if (offerId && viewMode === 'INCOMING' && data) {
        data = data.filter((req: MarketRequest) => req.offer_id === offerId);
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f4f4f4' }]}>
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, viewMode === 'INCOMING' && styles.activeTab]}
                    onPress={() => setViewMode('INCOMING')}
                >
                    <Text style={[styles.tabText, viewMode === 'INCOMING' && styles.activeTabText]}>{t('market.inbox')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, viewMode === 'OUTGOING' && styles.activeTab]}
                    onPress={() => setViewMode('OUTGOING')}
                >
                    <Text style={[styles.tabText, viewMode === 'OUTGOING' && styles.activeTabText]}>{t('market.sent')}</Text>
                </TouchableOpacity>
            </View>

            {offerId && (
                <View style={{ padding: 12, backgroundColor: isDark ? '#222' : '#e8f6f3', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: isDark ? '#fff' : '#2c3e50', fontWeight: '500' }}>
                        {t('market.filterContext', {
                            type: params.contextType === 'OFFER' ? t('market.sell') : t('market.buy'),
                            amount: params.contextAmount,
                            currency: params.contextCurrency
                        })}
                    </Text>
                    <TouchableOpacity onPress={() => router.setParams({ offerId: null })}>
                        <FontAwesome name="times-circle" size={20} color={isDark ? '#aaa' : '#7f8c8d'} />
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>{t('market.noRequests')}</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    tabs: { flexDirection: 'row', backgroundColor: '#333' },
    tab: { flex: 1, padding: 15, alignItems: 'center' },
    activeTab: { borderBottomWidth: 3, borderBottomColor: '#3498db' },
    tabText: { color: '#888', fontWeight: '600' },
    activeTabText: { color: '#fff' },

    card: { padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    cardLight: { backgroundColor: '#fff' },
    cardDark: { backgroundColor: '#1c1c1e' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontWeight: 'bold', fontSize: 16 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    actions: { flexDirection: 'row', marginTop: 15, gap: 10, justifyContent: 'flex-end' },
    btn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
    btnReject: { backgroundColor: '#e74c3c' },
    btnAccept: { backgroundColor: '#2ecc71' },
    btnText: { color: '#fff', fontWeight: '600' },

    contactInfo: { marginTop: 15, padding: 10, backgroundColor: 'rgba(46, 204, 113, 0.2)', borderRadius: 6 }
});
