

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface HistoryRate {
    date: string;
    buy_price: number;
    sell_price: number;
    type: 'OFFICIAL' | 'BLACK_MARKET';
    created_at: string;
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';

const getDaysForRange = (range: TimeRange) => {
    switch (range) {
        case '1W': return 7;
        case '1M': return 30;
        case '3M': return 90;
        case '6M': return 180;
        case '1Y': return 365;
        default: return 30;
    }
}

const fetchHistory = async (currency: string, range: TimeRange): Promise<HistoryRate[]> => {
    const days = getDaysForRange(range);

    // Calculate the start date based on the range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
        .from('rates')
        .select('date, buy_price, sell_price, type, created_at')
        .eq('currency', currency)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data as HistoryRate[];
};

export default function CurrencyDetails() {
    const { currency } = useLocalSearchParams<{ currency: string }>();
    const colorScheme = useColorScheme();
    const router = useRouter();
    const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
    const [selectedType, setSelectedType] = useState<'BLACK_MARKET' | 'OFFICIAL'>('BLACK_MARKET');

    const { data, isLoading, refetch } = useQuery<HistoryRate[]>({
        queryKey: ['history', currency, selectedRange],
        queryFn: () => fetchHistory(currency!, selectedRange),
        enabled: !!currency,
    });

    // Helper to calculate trend
    const trendInfo = useMemo(() => {
        if (!data || data.length < 2) return null;

        const filtered = data.filter(r => r.type === selectedType);
        if (filtered.length < 2) return null;

        const startPrice = filtered[0].buy_price;
        const endPrice = filtered[filtered.length - 1].buy_price;
        const diff = endPrice - startPrice;
        const percent = (diff / startPrice) * 100;

        return {
            diff,
            percent,
            isPositive: diff >= 0
        };
    }, [data, selectedType]);


    if (!currency) return <Text>Invalid Currency</Text>;

    const chartData = useMemo(() => {
        if (!data) return [];
        return data.filter(r => r.type === selectedType);
    }, [data, selectedType]);

    // Optimize labels to not overcrowd the x-axis
    const labels = useMemo(() => {
        if (chartData.length === 0) return [];

        // Show max 6 labels evenly distributed
        const step = Math.ceil(chartData.length / 6);
        return chartData
            .filter((_, index) => index % step === 0)
            .map(d => {
                const date = new Date(d.created_at);
                return `${date.getDate()}/${date.getMonth() + 1}`;
            });
    }, [chartData]);

    const buyPrices = chartData.map(d => d.buy_price);

    const ranges: TimeRange[] = ['1W', '1M', '3M', '6M', '1Y'];

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen
                options={{
                    title: `${currency} Analytics`,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                            <Ionicons name="arrow-back" size={24} color={Colors[colorScheme ?? 'light'].text} />
                        </TouchableOpacity>
                    )
                }}
            />

            {/* Time Range Selector */}
            <View style={styles.rangeContainer}>
                {ranges.map(range => (
                    <TouchableOpacity
                        key={range}
                        style={[
                            styles.rangeButton,
                            selectedRange === range && { backgroundColor: Colors[colorScheme ?? 'light'].tint }
                        ]}
                        onPress={() => setSelectedRange(range)}
                    >
                        <Text style={[
                            styles.rangeText,
                            selectedRange === range && { color: 'white', fontWeight: 'bold' },
                            { color: Colors[colorScheme ?? 'light'].text }
                        ]}>
                            {range}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Market Type Toggle */}
            <View style={styles.typeContainer}>
                {(['BLACK_MARKET', 'OFFICIAL'] as const).map(type => (
                    <TouchableOpacity
                        key={type}
                        style={[
                            styles.typeButton,
                            selectedType === type && { borderBottomColor: Colors[colorScheme ?? 'light'].tint, borderBottomWidth: 2 }
                        ]}
                        onPress={() => setSelectedType(type)}
                    >
                        <Text style={[
                            styles.typeText,
                            selectedType === type && { color: Colors[colorScheme ?? 'light'].tint, fontWeight: 'bold' },
                            { color: Colors[colorScheme ?? 'light'].text }
                        ]}>
                            {type === 'BLACK_MARKET' ? 'Square Market' : 'Official Bank'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {isLoading ? (
                <View style={{ height: 220, justifyContent: 'center' }}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <View>
                    {/* Trend Information */}
                    {trendInfo && (
                        <View style={[styles.trendCard, { backgroundColor: trendInfo.isPositive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' }]}>
                            <Ionicons
                                name={trendInfo.isPositive ? "trending-up" : "trending-down"}
                                size={24}
                                color={trendInfo.isPositive ? "#4CAF50" : "#F44336"}
                            />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={[styles.trendValue, { color: trendInfo.isPositive ? "#4CAF50" : "#F44336" }]}>
                                    {trendInfo.isPositive ? '+' : ''}{trendInfo.percent.toFixed(2)}%
                                </Text>
                                <Text style={styles.trendLabel}>
                                    {trendInfo.diff > 0 ? '+' : ''}{trendInfo.diff.toFixed(2)} DA in last {selectedRange}
                                </Text>
                            </View>
                        </View>
                    )}

                    {chartData.length > 0 ? (
                        <LineChart
                            data={{
                                labels: labels,
                                datasets: [
                                    {
                                        data: buyPrices,
                                        strokeWidth: 2,
                                    }
                                ]
                            }}
                            width={Dimensions.get("window").width - 32}
                            height={220}
                            yAxisLabel=""
                            yAxisSuffix=""
                            yAxisInterval={1}
                            chartConfig={{
                                backgroundColor: Colors[colorScheme ?? 'light'].background,
                                backgroundGradientFrom: Colors[colorScheme ?? 'light'].background,
                                backgroundGradientTo: Colors[colorScheme ?? 'light'].background,
                                decimalPlaces: 1,
                                color: (opacity = 1) => Colors[colorScheme ?? 'light'].tint,
                                labelColor: (opacity = 1) => Colors[colorScheme ?? 'light'].text,
                                style: {
                                    borderRadius: 16
                                },
                                propsForDots: {
                                    r: "4",
                                    strokeWidth: "2",
                                    stroke: Colors[colorScheme ?? 'light'].tint
                                }
                            }}
                            bezier
                            style={{
                                marginVertical: 8,
                                borderRadius: 16
                            }}
                            withInnerLines={false}
                            withOuterLines={false}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="bar-chart-outline" size={48} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
                            <Text style={[styles.emptyText, { color: Colors[colorScheme ?? 'light'].text }]}>
                                No data available for this period.
                            </Text>
                        </View>
                    )}
                </View>
            )}

            <View style={styles.infoSection}>
                <Ionicons name="information-circle-outline" size={20} color={Colors[colorScheme ?? 'light'].tabIconDefault} />
                <Text style={[styles.disclaimer, { color: Colors[colorScheme ?? 'light'].tabIconDefault }]}>
                    Exchange rates are updated daily. Trends are calculated based on the difference between the first and last available data point in the selected period.
                </Text>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    rangeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        backgroundColor: 'rgba(150,150,150, 0.1)',
        borderRadius: 12,
        padding: 4,
    },
    rangeButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    rangeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    typeContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        justifyContent: 'center',
        gap: 20
    },
    typeButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    typeText: {
        fontSize: 16,
        fontWeight: '500',
        opacity: 0.8
    },
    trendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    trendValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    trendLabel: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: 2,
    },
    emptyContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.6
    },
    emptyText: {
        marginTop: 10,
        fontSize: 14,
    },
    infoSection: {
        flexDirection: 'row',
        marginTop: 20,
        padding: 12,
        backgroundColor: 'rgba(150,150,150, 0.05)',
        borderRadius: 8,
        gap: 10
    },
    disclaimer: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18
    }
});
