import { View } from '@/components/Themed';
import AlertManager from '@/src/components/AlertManager';
import CreateAlertModal from '@/src/components/CreateAlertModal';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';

export default function AlertsScreen() {
    const [showCreateModal, setShowCreateModal] = useState(false);

    return (
        <View style={styles.container}>
            <AlertManager onCreateAlert={() => setShowCreateModal(true)} />
            <CreateAlertModal
                visible={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
