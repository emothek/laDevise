import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { AnalyticsEvents, trackAnalyticsEvent } from '@/src/lib/aptabase';
import { Ionicons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

// Ensure OAuth redirects work
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [user, setUser] = useState<any>(null); // Track logged in user
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();

    // Check auth state
    React.useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithEmail = async () => {
        if (!email || !password) {
            Alert.alert(t('common.error'), t('auth.enterBoth'));
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        setLoading(false);
        if (error) {
            Alert.alert(t('common.error'), error.message);
        } else {
            trackAnalyticsEvent(AnalyticsEvents.USER_LOGIN, { method: 'email' });
        }
    };

    const signOut = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        setLoading(false);
        if (error) {
            Alert.alert(t('common.error'), error.message);
        } else {
            trackAnalyticsEvent(AnalyticsEvents.USER_LOGOUT);
        }
    };

    const signUpWithEmail = async () => {
        if (!email || !password) {
            Alert.alert(t('common.error'), t('auth.enterBoth'));
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        setLoading(false);
        if (error) {
            Alert.alert(t('common.error'), error.message);
        } else {
            trackAnalyticsEvent(AnalyticsEvents.USER_SIGNUP, { method: 'email' });
            Alert.alert(t('auth.verificationSent'), t('auth.checkEmail'));
        }
    };

    const forgotPassword = async () => {
        if (!email) {
            Alert.alert('Required', 'Please enter your email address first to reset your password.');
            return;
        }
        setResetLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: Linking.createURL('/auth/reset-callback'),
        });
        setResetLoading(false);
        if (error) Alert.alert('Error', error.message);
        else Alert.alert('Check Email', 'Password reset instructions have been sent to your email.');
    };

    const signInWithProvider = async (provider: 'google' | 'facebook') => {
        const redirectTo = Linking.createURL('/auth/callback');
        console.log("OAuth Redirect URL:", redirectTo);

        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                },
            });
            if (error) throw error;

            if (data.url) {
                console.log('Opening OAuth URL:', data.url);

                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

                console.log('WebBrowser result type:', result.type);
                if (result.type === 'success') {
                    console.log('Success! Returned URL:', result.url);

                    if (result.url) {
                        // Extract tokens from the URL hash
                        const url = new URL(result.url);
                        const hashParams = new URLSearchParams(url.hash.substring(1));

                        const access_token = hashParams.get('access_token');
                        const refresh_token = hashParams.get('refresh_token');

                        if (access_token && refresh_token) {
                            console.log('Tokens extracted, setting session...');

                            // Manually set the session
                            const { error: sessionError } = await supabase.auth.setSession({
                                access_token,
                                refresh_token,
                            });

                            if (sessionError) {
                                console.error('Error setting session:', sessionError);
                                Alert.alert('Session Error', sessionError.message);
                            } else {
                                console.log('Session established successfully!');
                            }
                        } else {
                            console.error('No tokens found in URL');
                            Alert.alert('Error', 'Authentication failed - no tokens received');
                        }
                    }
                } else if (result.type === 'cancel') {
                    console.log('User cancelled OAuth');
                } else {
                    console.log('OAuth dismissed');
                }
            }
        } catch (e: any) {
            console.error('OAuth Error:', e);
            Alert.alert('Auth Error', e.message);
        }
    };

    // If logged in, show Profile UI
    if (user) {
        return (
            <View style={styles.container}>
                <View style={[styles.scrollContent, { alignItems: 'center' }]}>
                    <FontAwesome name="user-circle" size={80} color={theme.tint} style={{ marginBottom: 20 }} />
                    <Text style={styles.header}>{t('auth.loggedIn')}</Text>
                    <Text style={[styles.subHeader, { textAlign: 'center' }]}>{user.email}</Text>

                    <View style={{ width: '100%', maxWidth: 300, gap: 10, marginTop: 20 }}>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: '#e74c3c' }]}
                            onPress={signOut}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('auth.signOut')}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.header}>{t('auth.welcomeBack')}</Text>
                <Text style={styles.subHeader}>{t('auth.signInPrompt')}</Text>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('auth.email')}</Text>
                        <TextInput
                            style={[styles.input, { color: theme.text, borderColor: theme.tabIconDefault }]}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            placeholder="hello@example.com"
                            placeholderTextColor={theme.tabIconDefault}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>{t('auth.password')}</Text>
                        <View style={[styles.passwordContainer, { borderColor: theme.tabIconDefault }]}>
                            <TextInput
                                style={[styles.passwordInput, { color: theme.text }]}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!isPasswordVisible}
                                autoCapitalize="none"
                                placeholder="********"
                                placeholderTextColor={theme.tabIconDefault}
                            />
                            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                                <Ionicons
                                    name={isPasswordVisible ? "eye-off" : "eye"}
                                    size={24}
                                    color={theme.tabIconDefault}
                                />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={forgotPassword} disabled={resetLoading} style={styles.forgotButton}>
                            <Text style={[styles.forgotText, { color: theme.tint }]}>
                                {resetLoading ? t('common.loading') : t('auth.forgotPassword')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.tint, flex: 1 }]}
                            onPress={signInWithEmail}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('auth.signIn')}</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.outlineButton, { borderColor: theme.tint, flex: 1 }]}
                            onPress={signUpWithEmail}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color={theme.tint} /> : <Text style={[styles.buttonText, { color: theme.tint }]}>{t('auth.signUp')}</Text>}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider}>
                        <View style={[styles.line, { backgroundColor: theme.tabIconDefault }]} />
                        <Text style={[styles.dividerText, { color: theme.tabIconDefault }]}>{t('auth.or')}</Text>
                        <View style={[styles.line, { backgroundColor: theme.tabIconDefault }]} />
                    </View>

                    <TouchableOpacity
                        style={[styles.socialButton, { backgroundColor: '#DB4437' }]} // Google Red
                        onPress={() => signInWithProvider('google')}
                    >
                        <FontAwesome name="google" size={20} color="white" style={styles.socialIcon} />
                        <Text style={styles.socialButtonText}>Continue with Google</Text>
                    </TouchableOpacity>

                    {/* <TouchableOpacity
                        style={[styles.socialButton, { backgroundColor: '#4267B2' }]} // FB Blue
                        onPress={() => signInWithProvider('facebook')}
                    >
                        <FontAwesome name="facebook" size={20} color="white" style={styles.socialIcon} />
                        <Text style={styles.socialButtonText}>Continue with Facebook</Text>
                    </TouchableOpacity> */}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        justifyContent: 'center',
        flexGrow: 1,
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subHeader: {
        fontSize: 16,
        opacity: 0.6,
        marginBottom: 32,
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.7,
    },
    input: {
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    passwordInput: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    eyeIcon: {
        marginLeft: 8,
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    forgotText: {
        fontSize: 14,
        fontWeight: '500',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    button: {
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    line: {
        flex: 1,
        height: 1,
        opacity: 0.3,
    },
    dividerText: {
        marginHorizontal: 16,
        opacity: 0.5,
        fontSize: 12,
    },
    socialButton: {
        flexDirection: 'row',
        height: 50,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    socialIcon: {
        marginRight: 12,
    },
    socialButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
