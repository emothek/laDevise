import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { ExchangeRate, fetchRates } from '@/services/rates';
import { AnalyticsEvents, trackAnalyticsEvent } from '@/src/lib/aptabase';
import { useHistoryStore } from '@/store/history';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

export default function CalculatorScreen() {
  const { t } = useTranslation();
  const { data: rates } = useQuery<ExchangeRate[]>({ queryKey: ['rates'], queryFn: fetchRates });
  const { history, addToHistory, clearHistory } = useHistoryStore();

  const [amount, setAmount] = useState('100');
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [rateType, setRateType] = useState<'OFFICIAL' | 'BLACK_MARKET'>('BLACK_MARKET');
  const [direction, setDirection] = useState<'DZD_TO_FOREIGN' | 'FOREIGN_TO_DZD'>('FOREIGN_TO_DZD');

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const activeRate = useMemo(() => {
    if (!rates) return null;
    return rates.find(r => r.currency === selectedCurrency && r.type === rateType);
  }, [rates, selectedCurrency, rateType]);

  const result = useMemo(() => {
    if (!activeRate || !amount || isNaN(Number(amount))) return 0;
    const val = Number(amount);
    if (direction === 'FOREIGN_TO_DZD') {
      return val * activeRate.sell_price;
    }
    return val / activeRate.buy_price;
  }, [activeRate, amount, direction]);

  const handleSave = () => {
    if (!activeRate) return;
    addToHistory({
      fromCurrency: direction === 'FOREIGN_TO_DZD' ? selectedCurrency : 'DZD',
      toCurrency: direction === 'FOREIGN_TO_DZD' ? 'DZD' : selectedCurrency,
      amount: Number(amount),
      result,
      rate: direction === 'FOREIGN_TO_DZD' ? activeRate.sell_price : activeRate.buy_price,
      type: rateType,
    });
    trackAnalyticsEvent(AnalyticsEvents.CURRENCY_CONVERTED, {
      from: direction === 'FOREIGN_TO_DZD' ? selectedCurrency : 'DZD',
      to: direction === 'FOREIGN_TO_DZD' ? 'DZD' : selectedCurrency,
      type: rateType,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Converter Card */}
        <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
          <Text style={styles.cardTitle}>Converter</Text>

          <View style={styles.segmentContainer}>
            {(['BLACK_MARKET', 'OFFICIAL'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.segmentButton,
                  rateType === type && { backgroundColor: theme.tint },
                ]}
                onPress={() => setRateType(type)}
              >
                <Text style={[
                  styles.segmentText,
                  rateType === type && { color: 'white', fontWeight: 'bold' }
                ]}>
                  {type === 'BLACK_MARKET' ? 'Square' : 'Official'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {direction === 'FOREIGN_TO_DZD' ? selectedCurrency : 'DZD'}
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#999"
            />
          </View>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setDirection(prev => prev === 'FOREIGN_TO_DZD' ? 'DZD_TO_FOREIGN' : 'FOREIGN_TO_DZD')}
          >
            <FontAwesome name="exchange" size={20} color={theme.tint} />
          </TouchableOpacity>

          <View style={styles.resultContainer}>
            <Text style={styles.inputLabel}>
              {direction === 'FOREIGN_TO_DZD' ? 'DZD' : selectedCurrency}
            </Text>
            <Text style={[styles.resultText, { color: theme.text }]}>
              {direction === 'DZD_TO_FOREIGN' ? result.toFixed(2) : result.toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.tint }]} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Calculation</Text>
          </TouchableOpacity>
        </View>

        {/* Currency Selector */}
        <View style={styles.currencyList}>
          <Text style={styles.sectionHeader}>Select Currency</Text>
          <View style={styles.flexRow}>
            {['EUR', 'USD', 'CAD', 'GBP', 'CHF'].map(curr => (
              <TouchableOpacity
                key={curr}
                style={[
                  styles.currencyChip,
                  selectedCurrency === curr && { backgroundColor: theme.tint, borderColor: theme.tint }
                ]}
                onPress={() => setSelectedCurrency(curr)}
              >
                <Text style={[
                  styles.currencyChipText,
                  selectedCurrency === curr && { color: 'white' }
                ]}>{curr}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Card */}
        {activeRate && (
          <View style={[styles.infoCard, { borderColor: theme.tabIconDefault }]}>
            <Text style={styles.infoText}>Current Rate (1 {selectedCurrency})</Text>
            <Text style={styles.infoRate}>
              Buy: {activeRate.buy_price.toFixed(2)} | Sell: {activeRate.sell_price.toFixed(2)}
            </Text>
          </View>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionHeader}>History</Text>
              <TouchableOpacity onPress={clearHistory}>
                <Text style={{ color: 'red', fontSize: 12 }}>Clear</Text>
              </TouchableOpacity>
            </View>
            {history.map((item) => (
              <View key={item.id} style={[styles.historyItem, { borderBottomColor: theme.tabIconDefault }]}>
                <View>
                  <Text style={[styles.historyMainText, { color: theme.text }]}>
                    {item.amount} {item.fromCurrency} ➔ {item.result.toFixed(2)} {item.toCurrency}
                  </Text>
                  <Text style={[styles.historySubText, { color: theme.text }]}>
                    {new Date(item.date).toLocaleDateString()} • {item.type === 'BLACK_MARKET' ? 'Square' : 'Official'}
                  </Text>
                </View>
                <Text style={[styles.historyRate, { color: theme.text }]}>@ {item.rate}</Text>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardLight: {
    backgroundColor: 'white',
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
    shadowOpacity: 0.3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(150,150,150, 0.15)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  inputContainer: {
    marginBottom: 0,
    backgroundColor: 'rgba(150,150,150, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  resultContainer: {
    backgroundColor: 'rgba(150,150,150, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    fontSize: 32,
    fontWeight: '700',
    height: 50,
    paddingVertical: 0,
  },
  resultText: {
    fontSize: 32,
    fontWeight: '700',
  },
  switchButton: {
    alignSelf: 'center',
    marginVertical: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(150,150,150, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  currencyList: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  flexRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  currencyChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
  },
  currencyChipText: {
    fontWeight: '600',
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    opacity: 0.7,
    marginBottom: 30,
  },
  infoText: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoRate: {
    fontSize: 14,
    fontWeight: '600',
  },
  historySection: {
    marginTop: 0,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyMainText: {
    fontSize: 16,
    fontWeight: '600',
  },
  historySubText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  historyRate: {
    fontSize: 14,
    opacity: 0.7,
  },
});
