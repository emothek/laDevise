import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { deleteAlert, fetchUserAlerts, PriceAlert, updateAlert } from '@/src/services/alerts';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

interface AlertManagerProps {
    onCreateAlert: () => void;
}

export default function AlertManager({ onCreateAlert }: AlertManagerProps) {
    const { t } = useTranslation();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const queryClient = useQueryClient();

    const { data: alerts, isLoading } = useQuery({
        queryKey: ['userAlerts'],
        queryFn: fetchUserAlerts,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userAlerts'] });
        }
    });

    const toggleMutation = useMutation({
        mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
            updateAlert(id, { is_active: isActive }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['userAlerts'] });
        }
    });

    const renderAlert = ({ item }: { item: PriceAlert }) => {
        const getAlertDescription = () => {
            if (item.alert_type === 'FIXED') {
                const direction = item.comparison === 'ABOVE' ? '>' : '<';
                return `${item.currency} ${direction} ${item.threshold_value}`;
            } else {
                return `${item.currency} changes by ${item.threshold_value} DZD`;
            }
        };

        return (
            <View style={[styles.alertCard, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fff' }]}>
                <View style={styles.alertContent}>
                    <View style={styles.alertInfo}>
                        <Text style={[styles.alertTitle, { color: theme.text }]}>
                            {getAlertDescription()}
                        </Text>
                        <Text style={[styles.alertType, { color: theme.text, opacity: 0.5 }]}>
                            {item.alert_type === 'FIXED' ? t('alerts.fixed', 'Fixed Price') : t('alerts.volatility', 'Volatility')}
                        </Text>
                    </View>
                    <View style={styles.alertActions}>
                        <Switch
                            value={item.is_active}
                            onValueChange={(value) => toggleMutation.mutate({ id: item.id, isActive: value })}
                            trackColor={{ false: '#767577', true: theme.tint }}
                            thumbColor={item.is_active ? '#fff' : '#f4f3f4'}
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                        <TouchableOpacity
                            onPress={() => deleteMutation.mutate(item.id)}
                            style={styles.deleteButton}
                        >
                            <Ionicons name="trash-outline" size={20} color="#F44336" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.tint} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('alerts.myAlerts', 'My Alerts')}</Text>
                <TouchableOpacity onPress={onCreateAlert} style={[styles.addButton, { backgroundColor: theme.tint }]}>
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.addButtonText}>{t('alerts.add', 'Add')}</Text>
                </TouchableOpacity>
            </View>

            {!alerts || alerts.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="notifications-off-outline" size={48} color={theme.text} style={{ opacity: 0.3 }} />
                    <Text style={[styles.emptyText, { color: theme.text }]}>{t('alerts.noAlerts', 'No alerts set')}</Text>
                    <Text style={[styles.emptySubtext, { color: theme.text }]}>{t('alerts.createFirst', 'Create your first alert to get notified')}</Text>
                </View>
            ) : (
                <FlatList
                    data={alerts}
                    renderItem={renderAlert}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
    addButtonText: {
        color: 'white',
        fontWeight: '600',
        marginLeft: 4,
        fontSize: 14,
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
    },
    alertCard: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    alertContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    alertInfo: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    alertType: {
        fontSize: 12,
    },
    alertActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteButton: {
        padding: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        opacity: 0.6,
        textAlign: 'center',
    },
});
