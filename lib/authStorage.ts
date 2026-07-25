import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedStorage } from '@supabase/supabase-js';

export const AUTH_STORAGE_KEY = 'cookmapz-auth';

/** Persistent auth session storage for Supabase (native + web via AsyncStorage). */
export const authStorage: SupportedStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};
