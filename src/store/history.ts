import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface HistoryItem {
    id: string;
    fromCurrency: string;
    toCurrency: string;
    amount: number;
    result: number;
    rate: number;
    date: string;
    type: 'OFFICIAL' | 'BLACK_MARKET';
}

interface HistoryState {
    history: HistoryItem[];
    addToHistory: (item: Omit<HistoryItem, 'id' | 'date'>) => void;
    clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>()(
    persist(
        (set) => ({
            history: [],
            addToHistory: (item) =>
                set((state) => ({
                    history: [
                        { ...item, id: Math.random().toString(36).substring(7), date: new Date().toISOString() },
                        ...state.history,
                    ].slice(0, 50), // Keep last 50 items
                })),
            clearHistory: () => set({ history: [] }),
        }),
        {
            name: 'calculation-history',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
