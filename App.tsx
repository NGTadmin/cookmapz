import './global.css';

import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  useFonts as useDmSans,
} from '@expo-google-fonts/dm-sans';
import {
  Syne_700Bold,
  Syne_800ExtraBold,
  useFonts as useSyne,
} from '@expo-google-fonts/syne';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { AppShell } from './components/cook/AppShell';
import { AuthProvider } from './hooks/useAuth';
import { cookTheme } from './theme/cookTheme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const FONT_LOAD_TIMEOUT_MS = 4000;
const SPLASH_FAILSAFE_MS = 6000;

function hideSplashScreen() {
  void SplashScreen.hideAsync().catch(() => {});
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[App] render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: cookTheme.bg, minHeight: '100%' }}
        >
          <Text className="text-[20px] text-white" style={{ fontFamily: 'Syne_700Bold' }}>
            Something went wrong
          </Text>
          <Text
            className="mt-3 text-center text-[14px] leading-5 text-white/80"
            style={{ fontFamily: 'DMSans_400Regular' }}
          >
            {this.state.error.message}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [syneLoaded, syneError] = useSyne({ Syne_700Bold, Syne_800ExtraBold });
  const [dmLoaded, dmError] = useDmSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });
  const [fontTimedOut, setFontTimedOut] = useState(false);

  const fontsReady = (syneLoaded && dmLoaded) || fontTimedOut || Boolean(syneError || dmError);

  useEffect(() => {
    if (syneError) console.warn('[App] Syne font load failed:', syneError.message);
    if (dmError) console.warn('[App] DM Sans font load failed:', dmError.message);
  }, [syneError, dmError]);

  useEffect(() => {
    const fontTimer = setTimeout(() => setFontTimedOut(true), FONT_LOAD_TIMEOUT_MS);
    const splashTimer = setTimeout(hideSplashScreen, SPLASH_FAILSAFE_MS);
    return () => {
      clearTimeout(fontTimer);
      clearTimeout(splashTimer);
    };
  }, []);

  useEffect(() => {
    if (fontsReady) hideSplashScreen();
  }, [fontsReady]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    for (const el of [document.documentElement, document.body, document.getElementById('root')]) {
      if (!el) continue;
      el.style.height = '100%';
      el.style.margin = '0';
      el.style.backgroundColor = cookTheme.bg;
    }
  }, []);

  if (!fontsReady) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: cookTheme.bg, minHeight: '100%' }}
      >
        <ActivityIndicator color={cookTheme.accent} size="large" />
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <AuthProvider>
        <StatusBar style="light" />
        <AppShell />
      </AuthProvider>
    </AppErrorBoundary>
  );
}
