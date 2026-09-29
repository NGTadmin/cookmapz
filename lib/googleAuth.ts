import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/** Deep link / web origin Supabase redirects to after Google OAuth. */
export function getAuthRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }

  return makeRedirectUri({
    scheme: 'cookmapz',
    path: 'auth/callback',
  });
}

async function createSessionFromUrl(url: string): Promise<{ error: string | null }> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    return { error: errorCode };
  }

  const access_token = params.access_token;
  const refresh_token = params.refresh_token;

  if (!access_token || !refresh_token) {
    return { error: 'Google sign-in did not return a session. Try again.' };
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return { error: error?.message ?? null };
}

/**
 * Sign in or sign up with Google (same OAuth flow creates the account on first use).
 * Web: full-page redirect. Native: in-app browser auth session.
 */
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const redirectTo = getAuthRedirectUri();

  if (Platform.OS === 'web') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) return { error: error.message };
    if (!data.url) return { error: 'Could not start Google sign-in.' };

    // Browser navigates away; session is restored via detectSessionInUrl on return.
    window.location.assign(data.url);
    return { error: null };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) return { error: error.message };
  if (!data.url) return { error: 'Could not start Google sign-in.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !('url' in result) || !result.url) {
    return { error: result.type === 'cancel' ? null : 'Google sign-in was cancelled.' };
  }

  return createSessionFromUrl(result.url);
}

/** Handle cold-start / deep-link return URLs that contain auth tokens. */
export async function createSessionFromLinkUrl(url: string | null): Promise<void> {
  if (!url) return;
  if (!url.includes('access_token') && !url.includes('refresh_token')) return;
  await createSessionFromUrl(url);
}

export function subscribeToAuthLinks(onUrl: (url: string) => void): () => void {
  const sub = Linking.addEventListener('url', ({ url }) => onUrl(url));
  return () => sub.remove();
}
