import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { fetchSentiment, submitVote } from '@/src/services/sentiment';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

const DISMISS_KEY = 'sentiment_dismissed_date';

export default function SentimentWidget() {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const queryClient = useQueryClient();
    const [isDismissed, setIsDismissed] = useState(false);

    const { data: stats, isLoading } = useQuery({
        queryKey: ['sentiment'],
        queryFn: () => fetchSentiment('EUR'),
    });

    useEffect(() => {
        checkDismissed();
    }, []);

    const checkDismissed = async () => {
        try {
            const dismissedDate = await AsyncStorage.getItem(DISMISS_KEY);
            if (dismissedDate) {
                const today = new Date().toISOString().split('T')[0];
                if (dismissedDate === today) {
                    setIsDismissed(true);
                } else {
                    await AsyncStorage.removeItem(DISMISS_KEY);
                }
            }
        } catch (e) {
            console.error("Failed to check dismiss state", e);
        }
    };

    const handleDismiss = async () => {
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem(DISMISS_KEY, today);
        setIsDismissed(true);
    };

    const voteMutation = useMutation({
        mutationFn: async (type: 'BULLISH' | 'BEARISH') => {
            const { data: { session } } = await import('@/lib/supabase').then(m => m.supabase.auth.getSession());
            if (!session) {
                throw new Error("AUTH_REQUIRED");
            }
            return submitVote(type, 'EUR');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sentiment'] });
        },
        onError: (error) => {
            if (error.message === 'AUTH_REQUIRED') {
                alert(t('marketPulse.loginRequired', "Please log in to vote."));
            } else if (error.message === 'ALREADY_VOTED') {
                alert(t('marketPulse.alreadyVoted', "You have already voted today."));
            } else {
                console.error("Vote failed", error);
                alert(t('common.error', "Something went wrong. Please try again."));
            }
        }
    });

    if (isLoading || isDismissed) return null;

    const hasVoted = !!stats?.userVote;
    const total = stats?.totalVotes || 0;
    const bullishPct = total > 0 ? Math.round((stats?.bullishCount || 0) / total * 100) : 50;

    return (
        <View style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff' }]}>
            <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
            >
                <Ionicons name="close-circle" size={16} color={theme.text} style={{ opacity: 0.3 }} />
            </TouchableOpacity>

            {!hasVoted ? (
                <View style={styles.voteContainer}>
                    <Text style={[styles.compactTitle, { color: theme.text }]}>{t('marketPulse.compactQuestion', "EUR?")}</Text>
                    <View style={styles.compactButtonRow}>
                        <TouchableOpacity
                            style={[styles.compactButton, { backgroundColor: '#4CAF50' }]}
                            onPress={() => voteMutation.mutate('BULLISH')}
                            disabled={voteMutation.isPending}
                        >
                            {voteMutation.isPending ? <ActivityIndicator size="small" color="white" /> : (
                                <Text style={styles.compactButtonText}>🚀</Text>
                            )}
                        </TouchableOpacity>

                        <View style={{ width: 6 }} />

                        <TouchableOpacity
                            style={[styles.compactButton, { backgroundColor: '#F44336' }]}
                            onPress={() => voteMutation.mutate('BEARISH')}
                            disabled={voteMutation.isPending}
                        >
                            {voteMutation.isPending ? <ActivityIndicator size="small" color="white" /> : (
                                <Text style={styles.compactButtonText}>📉</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.resultContainer}>
                    <View style={styles.barContainer}>
                        <View style={[styles.barPart, { flex: bullishPct, backgroundColor: '#4CAF50', borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]}>
                            {bullishPct > 20 && <Text style={styles.barText}>{bullishPct}%</Text>}
                        </View>
                        <View style={[styles.barPart, { flex: 100 - bullishPct, backgroundColor: '#F44336', borderTopRightRadius: 4, borderBottomRightRadius: 4 }]}>
                            {(100 - bullishPct) > 20 && <Text style={styles.barText}>{100 - bullishPct}%</Text>}
                        </View>
                    </View>
                    <Text style={styles.miniStats}>{total} {t('marketPulse.votes', "votes")}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        marginVertical: 4,
        padding: 6,
        paddingRight: 28,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 1,
        elevation: 1,
    },
    dismissButton: {
        position: 'absolute',
        top: 2,
        right: 2,
        zIndex: 10,
        padding: 4,
    },
    voteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    compactTitle: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    compactButtonRow: {
        flexDirection: 'row',
    },
    compactButton: {
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 12,
        minWidth: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactButtonText: {
        fontSize: 16,
    },
    resultContainer: {
        width: '100%',
    },
    barContainer: {
        flexDirection: 'row',
        height: 16,
        width: '100%',
    },
    barPart: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    barText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    miniStats: {
        fontSize: 8,
        opacity: 0.4,
        textAlign: 'center',
        marginTop: 2,
    }
});
