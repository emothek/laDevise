import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Debug logging for production (will show in logcat)
console.log('[Supabase Init] URL Length:', rawUrl.length);
if (rawUrl.startsWith('$')) {
    console.error('[Supabase Init] ERROR: URL appears to be a literal variable name ($EXPO_PUBLIC_...) instead of the actual value. Check eas.json or EAS Secrets.');
}

// Stricter validation to avoid invalid URL error from supabase-js
const isValidUrl = (url: string) => url && (url.startsWith('http://') || url.startsWith('https://'));

const supabaseUrl = isValidUrl(rawUrl) ? rawUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = rawKey && !rawKey.startsWith('$') ? rawKey : 'placeholder';

if (supabaseUrl === 'https://placeholder.supabase.co') {
    console.error('[Supabase Init] Using placeholder URL. App will not function correctly.');
}

export const supabase = createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
        },
    }
);
