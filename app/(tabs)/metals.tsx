import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { Commodity, fetchCommodities } from '@/services/commodities';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

export default function MetalsScreen() {
    const { t } = useTranslation();
    const { data: commodities, refetch, isRefetching } = useQuery({ queryKey: ['commodities'], queryFn: fetchCommodities });
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const renderItem = ({ item }: { item: Commodity }) => (
        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
            <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                    <FontAwesome name="diamond" size={24} color={item.name.toLowerCase().includes('gold') ? '#FFD700' : '#C0C0C0'} />
                </View>
                <View>
                    <Text style={[styles.currencyCode, { color: isDark ? '#fff' : '#000' }]}>{item.name}</Text>
                    <Text style={{ fontSize: 12, opacity: 0.5, color: isDark ? '#fff' : '#000' }}>
                        {new Date(item.timestamp).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            <View style={styles.ratesContainer}>
                <View style={styles.rateColumn}>
                    <Text style={[styles.rateLabel, { color: isDark ? '#aaa' : '#666' }]}>{t('metals.global')}</Text>
                    <Text style={[styles.rateValue, { color: isDark ? '#fff' : '#000' }]}>${item.price_gram_usd.toFixed(2)}</Text>
                </View>
                <View style={styles.separator} />
                <View style={styles.rateColumn}>
                    <Text style={[styles.rateLabel, { color: isDark ? '#aaa' : '#666' }]}>{t('metals.official')}</Text>
                    <Text style={[styles.rateValue, { color: isDark ? '#fff' : '#000' }]}>{item.price_gram_dzd.toLocaleString()} DA</Text>
                </View>
            </View>

            {item.price_gram_dzd_parallel && (
                <View style={[styles.parallelContainer, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[styles.rateLabel, { color: isDark ? '#aaa' : '#666', marginBottom: 4 }]}>{t('metals.parallelEst')}</Text>
                    <Text style={[styles.parallelValue, { color: '#e74c3c' }]}>
                        {item.price_gram_dzd_parallel.toLocaleString()} DA
                    </Text>
                    <Text style={{ fontSize: 10, opacity: 0.4, color: isDark ? '#fff' : '#000', marginTop: 2 }}>
                        {t('metals.parallelBasis')}
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={commodities}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
                ListHeaderComponent={
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>{t('metals.headerTitle')}</Text>
                        <Text style={styles.headerSubtitle}>{t('metals.headerSubtitle')}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 16,
    },
    header: {
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        opacity: 0.6,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardLight: {
        backgroundColor: 'white',
    },
    cardDark: {
        backgroundColor: '#1c1c1e',
        shadowOpacity: 0.3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(150,150,150,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    currencyCode: {
        fontSize: 18,
        fontWeight: '700',
    },
    ratesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(150,150,150,0.05)',
        borderRadius: 12,
        padding: 12,
    },
    rateColumn: {
        flex: 1,
        alignItems: 'center',
    },
    separator: {
        width: 1,
        backgroundColor: '#ccc',
        opacity: 0.3,
    },
    rateLabel: {
        fontSize: 12,
        opacity: 0.6,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    rateValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    parallelContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        alignItems: 'center',
    },
    parallelValue: {
        fontSize: 22,
        fontWeight: '800',
    },
});
