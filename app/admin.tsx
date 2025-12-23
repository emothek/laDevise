import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function AdminScreen() {
    const [currency, setCurrency] = useState('EUR');
    const [type, setType] = useState<'OFFICIAL' | 'BLACK_MARKET'>('BLACK_MARKET');
    const [buyPrice, setBuyPrice] = useState('');
    const [sellPrice, setSellPrice] = useState('');
    const [source, setSource] = useState('Square Port Said');
    const [loading, setLoading] = useState(false);

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const handleSubmit = async () => {
        if (!buyPrice || !sellPrice) {
            Alert.alert('Error', 'Please enter prices');
            return;
        }

        setLoading(true);
        // In a real app, you would have RLS policies checking for an admin user
        const { error } = await supabase.from('rates').insert({
            currency,
            type,
            buy_price: parseFloat(buyPrice),
            sell_price: parseFloat(sellPrice),
            source,
        });
        setLoading(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert('Success', 'Rate added successfully');
            setBuyPrice('');
            setSellPrice('');
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Admin - Add Rate' }} />

            <View style={styles.form}>
                <Text style={styles.label}>Currency</Text>
                <View style={styles.row}>
                    {['EUR', 'USD', 'CAD', 'GBP', 'CHF'].map(c => (
                        <TouchableOpacity
                            key={c}
                            onPress={() => setCurrency(c)}
                            style={[styles.chip, currency === c && { backgroundColor: theme.tint, borderColor: theme.tint }]}
                        >
                            <Text style={[styles.chipText, currency === c && { color: 'white' }]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Type</Text>
                <View style={styles.row}>
                    {(['BLACK_MARKET', 'OFFICIAL'] as const).map(t => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setType(t)}
                            style={[styles.chip, type === t && { backgroundColor: theme.tint, borderColor: theme.tint }]}
                        >
                            <Text style={[styles.chipText, type === t && { color: 'white' }]}>{t === 'BLACK_MARKET' ? 'Square' : 'Official'}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.label}>Buy Price (1 {currency})</Text>
                <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.tabIconDefault }]}
                    value={buyPrice}
                    onChangeText={setBuyPrice}
                    keyboardType="numeric"
                    placeholder="e.g. 240.00"
                />

                <Text style={styles.label}>Sell Price (1 {currency})</Text>
                <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.tabIconDefault }]}
                    value={sellPrice}
                    onChangeText={setSellPrice}
                    keyboardType="numeric"
                    placeholder="e.g. 242.00"
                />

                <Text style={styles.label}>Source</Text>
                <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.tabIconDefault }]}
                    value={source}
                    onChangeText={setSource}
                    placeholder="Source"
                />

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.tint }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Add Rate'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    form: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.7,
        marginTop: 8,
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    chipText: {
        fontWeight: '500',
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    button: {
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
