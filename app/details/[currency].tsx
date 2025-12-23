
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface HistoryRate {
    date: string;
    buy_price: number;
    sell_price: number;
    type: 'OFFICIAL' | 'BLACK_MARKET';
}

const fetchHistory = async (currency: string) => {
    const { data, error } = await supabase
        .from('rates')
        .select('date, buy_price, sell_price, type, created_at')
        .eq('currency', currency)
        .order('created_at', { ascending: true })
        .limit(30); // Last 30 records

    if (error) throw error;
    return data;
};

export default function CurrencyDetails() {
    const { currency } = useLocalSearchParams<{ currency: string }>();
    const colorScheme = useColorScheme();
    const router = useRouter();

    const { data, isLoading } = useQuery({
        queryKey: ['history', currency],
        queryFn: () => fetchHistory(currency),
        enabled: !!currency,
    });

    if (!currency) return <Text>Invalid Currency</Text>;

    // Process data for chart
    const blackMarketData = data?.filter(r => r.type === 'BLACK_MARKET') || [];
    const officialData = data?.filter(r => r.type === 'OFFICIAL') || [];

    // Use Black Market for main graph if available, otherwise official
    const chartData = blackMarketData.length > 0 ? blackMarketData : officialData;

    const labels = chartData.map(d => {
        const date = new Date(d.created_at);
        return `${date.getDate()}/${date.getMonth() + 1}`;
    }).slice(-6); // Show last 6 labels to avoid clutter

    const buyPrices = chartData.map(d => d.buy_price);

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: `${currency} History`,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
                            <Ionicons name="arrow-back" size={24} color={Colors[colorScheme ?? 'light'].text} />
                        </TouchableOpacity>
                    )
                }}
            />

            {isLoading ? (
                <ActivityIndicator size="large" />
            ) : (
                <View>
                    <Text style={styles.chartTitle}>
                        {blackMarketData.length > 0 ? 'Black Market Rate History' : 'Official Rate History'}
                    </Text>

                    {chartData.length > 0 ? (
                        <LineChart
                            data={{
                                labels: labels,
                                datasets: [
                                    {
                                        data: buyPrices
                                    }
                                ]
                            }}
                            width={Dimensions.get("window").width - 32} // from react-native
                            height={220}
                            yAxisLabel=""
                            yAxisSuffix=" DA"
                            yAxisInterval={1}
                            chartConfig={{
                                backgroundColor: Colors[colorScheme ?? 'light'].background,
                                backgroundGradientFrom: Colors[colorScheme ?? 'light'].background,
                                backgroundGradientTo: Colors[colorScheme ?? 'light'].background,
                                decimalPlaces: 1,
                                color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                                labelColor: (opacity = 1) => Colors[colorScheme ?? 'light'].text,
                                style: {
                                    borderRadius: 16
                                },
                                propsForDots: {
                                    r: "6",
                                    strokeWidth: "2",
                                    stroke: "#ffa726"
                                }
                            }}
                            bezier
                            style={{
                                marginVertical: 8,
                                borderRadius: 16
                            }}
                        />
                    ) : (
                        <Text style={{ textAlign: 'center', marginTop: 20 }}>No historical data available.</Text>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center'
    }
});
