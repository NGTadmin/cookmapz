import { Alert, Platform, Share } from 'react-native';
import type { LiveStream } from '../types/live';

function appOrigin(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://cookmapz.com';
}

export function streamShareUrl(stream: LiveStream): string {
  const url = new URL(appOrigin());
  url.searchParams.set('v', stream.id);
  if (stream.creatorId) url.searchParams.set('c', stream.creatorId);
  return url.toString();
}

export async function shareStream(stream: LiveStream): Promise<void> {
  const url = streamShareUrl(stream);
  const title = `${stream.chefName} on CookMapz`;
  const message = stream.isLive
    ? `Watch ${stream.chefName} cook ${stream.dishName} live on CookMapz`
    : `Watch ${stream.chefName} cook ${stream.dishName} on CookMapz`;

  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (nav?.share) {
      try {
        await nav.share({ title, text: message, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }

    try {
      await nav?.clipboard?.writeText(url);
      Alert.alert('Link copied', 'Share link copied to your clipboard.');
      return;
    } catch {
      Alert.alert('Share this cook', url);
      return;
    }
  }

  await Share.share({
    title,
    message: `${message}\n${url}`,
    url,
  });
}
