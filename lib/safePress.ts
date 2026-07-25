import { Alert, Platform } from 'react-native';

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

export function reportActionError(title: string, error: unknown) {
  const message = toError(error).message || 'Something went wrong. Please try again.';
  console.warn(`[${title}]`, error);

  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}

/** Wrap sync/async press handlers so failures surface instead of crashing the app. */
export function safePress(
  handler: () => void | Promise<void>,
  options?: { errorTitle?: string; onError?: (error: Error) => void },
) {
  return () => {
    try {
      const result = handler();
      if (result instanceof Promise) {
        void result.catch((error) => {
          const err = toError(error);
          options?.onError?.(err);
          if (!options?.onError) {
            reportActionError(options?.errorTitle ?? 'Action failed', err);
          }
        });
      }
    } catch (error) {
      const err = toError(error);
      options?.onError?.(err);
      if (!options?.onError) {
        reportActionError(options?.errorTitle ?? 'Action failed', err);
      }
    }
  };
}
