import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function AuthCallback() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Listen for auth state changes - Supabase will automatically handle the session
        // when detectSessionInUrl is true
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);

            if (event === 'SIGNED_IN' && session) {
                console.log('User signed in successfully');
                setTimeout(() => {
                    router.replace('/(tabs)');
                }, 500);
            } else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
                router.replace('/login');
            }
        });

        // Timeout fallback in case auth state doesn't fire
        const timeout = setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    console.log('Session found via getSession');
                    router.replace('/(tabs)');
                } else {
                    console.log('No session found after timeout');
                    setError('Authentication timed out');
                    setTimeout(() => router.replace('/login'), 2000);
                }
            });
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" />
            <Text style={styles.text}>
                {error ? `Error: ${error}` : 'Completing sign in...'}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        padding: 20,
    },
    text: {
        fontSize: 16,
        opacity: 0.7,
        textAlign: 'center',
    },
});
