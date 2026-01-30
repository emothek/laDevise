import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { ExchangeRate, fetchRates } from '@/services/rates';
import SentimentWidget from '@/src/components/SentimentWidget';
import { useRateNotification } from '@/src/hooks/useRateNotification';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, RefreshControl, StyleSheet, Switch, TextInput, TouchableOpacity } from 'react-native';
const FLAG_MAP: Record<string, string> = {
  EUR: '🇪🇺',
  USD: '🇺🇸',
  CAD: '🇨🇦',
  GBP: '🇬🇧',
  CHF: '🇨🇭',
  CNY: '🇨🇳',
  TRY: '🇹🇷',
  SAR: '🇸🇦',
  AED: '🇦🇪',
  TND: '🇹🇳',
  MAD: '🇲🇦',
  JPY: '🇯🇵',
};

const PRIORITY_CURRENCIES = ['EUR', 'USD', 'CNY', 'CAD', 'CHF'];

interface GroupedRate {
  currency: string;
  official?: ExchangeRate;
  black_market?: ExchangeRate;
}

const RateCard = ({ item, isFavorite, onToggleFavorite, onPress }: { item: GroupedRate, isFavorite: boolean, onToggleFavorite: () => void, onPress: () => void }) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.card, isDark ? styles.cardDark : styles.cardLight]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.currencyIcon}>{FLAG_MAP[item.currency] || '🏳️'}</Text>
            <Text style={styles.currencyCode}>{item.currency}</Text>
          </View>
          <TouchableOpacity onPress={onToggleFavorite} style={styles.heartButton}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? "#e74c3c" : Colors[colorScheme ?? 'light'].text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.ratesContainer}>
          {/* Official Side */}
          <View style={styles.rateSide}>
            <Text style={styles.sideTitle}>{t('rates.official')}</Text>
            {item.official ? (
              <View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t('rates.buy')}:</Text>
                  <Text style={styles.priceValue}>{item.official.buy_price.toFixed(2)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t('rates.sell')}:</Text>
                  <Text style={styles.priceValue}>{item.official.sell_price.toFixed(2)}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.naText}>{t('common.na')}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Parallel Side */}
          <View style={styles.rateSide}>
            <Text style={styles.sideTitle}>{t('rates.parallel')}</Text>
            {item.black_market ? (
              <View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t('rates.buy')}:</Text>
                  <Text style={styles.priceValue}>{item.black_market.buy_price.toFixed(2)}</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t('rates.sell')}:</Text>
                  <Text style={styles.priceValue}>{item.black_market.sell_price.toFixed(2)}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.naText}>{t('common.na')}</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function RatesScreen() {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useQuery<ExchangeRate[]>({
    queryKey: ['rates'],
    queryFn: fetchRates,
    retry: false
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { isEnabled: isStickyEnabled, toggleSticky } = useRateNotification();

  // ... (keep useEffect and helper functions same)

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem('favorite_currencies');
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load favorites", e);
    }
  };

  const toggleFavorite = async (currency: string) => {
    const newFavorites = favorites.includes(currency)
      ? favorites.filter(c => c !== currency)
      : [...favorites, currency];

    setFavorites(newFavorites);
    await AsyncStorage.setItem('favorite_currencies', JSON.stringify(newFavorites));

    // Sync with Supabase
    try {
      const token = await AsyncStorage.getItem('push_token');
      if (token) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('push_subscriptions').upsert({
          token,
          user_id: user?.id ?? null,
          favorite_currencies: newFavorites,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'token' });
      }
    } catch (err) {
      console.error("Failed to sync favorites to server", err);
    }
  };


  const groupedData = useMemo(() => {
    if (!data) return [];

    const groups: Record<string, GroupedRate> = {};

    data.forEach(rate => {
      if (!groups[rate.currency]) {
        groups[rate.currency] = { currency: rate.currency };
      }
      if (rate.type === 'OFFICIAL') {
        groups[rate.currency].official = rate;
      } else {
        groups[rate.currency].black_market = rate;
      }
    });

    let result = Object.values(groups);

    // Filter by search
    if (searchQuery) {
      result = result.filter(g => g.currency.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Sort: Favorites first, then Priority list, then others
    result.sort((a, b) => {
      const aFav = favorites.includes(a.currency);
      const bFav = favorites.includes(b.currency);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      const aPriority = PRIORITY_CURRENCIES.indexOf(a.currency);
      const bPriority = PRIORITY_CURRENCIES.indexOf(b.currency);

      // If both in priority list
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;

      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;

      return a.currency.localeCompare(b.currency);
    });

    return result;

  }, [data, searchQuery, favorites]);

  const renderItem = ({ item }: { item: GroupedRate }) => (
    <RateCard
      item={item}
      isFavorite={favorites.includes(item.currency)}
      onToggleFavorite={() => toggleFavorite(item.currency)}
      onPress={() => router.push(`/details/${item.currency}`)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors[colorScheme ?? 'light'].text} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: Colors[colorScheme ?? 'light'].text }]}
          placeholder={t('common.searchPlaceholder')}
          placeholderTextColor={Colors[colorScheme ?? 'light'].tabIconDefault}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={{ paddingHorizontal: 0 }}>
        <SentimentWidget />

        {/* Sticky Notification Toggle (Android Only) */}
        {Platform.OS === 'android' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 16, marginBottom: 8 }}>
            <Ionicons name="notifications-outline" size={16} color={Colors[colorScheme ?? 'light'].text} style={{ marginRight: 8, opacity: 0.6 }} />
            <Text style={{ fontSize: 12, color: Colors[colorScheme ?? 'light'].text, marginRight: 8, opacity: 0.6 }}>{t('common.stickyRates', "Sticky Rates")}</Text>
            <Switch
              value={isStickyEnabled}
              onValueChange={toggleSticky}
              trackColor={{ false: '#767577', true: '#2f95dc' }}
              thumbColor={isStickyEnabled ? '#fff' : '#f4f3f4'}
              style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
            />
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>{t('rates.loading')}</Text>
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color={Colors[colorScheme ?? 'light'].text} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Text style={{ marginBottom: 16, textAlign: 'center' }}>{t('common.errorLoading', "Failed to load data")}</Text>
          <TouchableOpacity onPress={() => refetch()} style={[styles.retryButton, { backgroundColor: Colors[colorScheme ?? 'light'].tint }]}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('common.retry', "Retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          renderItem={renderItem}
          keyExtractor={(item) => item.currency}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors[colorScheme ?? 'light'].text} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('rates.noRates', "No rates available")}</Text>
              <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
                <Text style={{ color: Colors[colorScheme ?? 'light'].tint }}>{t('common.retry', "Refresh")}</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(150,150,150, 0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLight: {
    backgroundColor: '#ffffff',
  },
  cardDark: {
    backgroundColor: '#1c1c1e',
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150, 0.1)',
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartButton: {
    padding: 4,
  },
  currencyIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  currencyCode: {
    fontSize: 20,
    fontWeight: '700',
  },
  ratesContainer: {
    flexDirection: 'row',
  },
  rateSide: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(150,150,150, 0.2)',
    marginHorizontal: 10,
  },
  sideTitle: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
    opacity: 0.6,
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    minWidth: 80,
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginRight: 8,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  naText: {
    opacity: 0.3,
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 64,
  },
  emptyText: {
    opacity: 0.6,
  }
});
