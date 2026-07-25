import { Component, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ScreenErrorBoundary } from '../ScreenErrorBoundary';
import { cookTheme } from '../../theme/cookTheme';
import { GooglePickupMap } from './GooglePickupMap';
import { PickupMapNativeFallback } from './PickupMapNativeFallback';
import type { PickupMapProps } from './types';

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

type MapBoundaryProps = {
  children: ReactNode;
  fallbackProps: PickupMapProps;
};

type MapBoundaryState = {
  failed: boolean;
};

class MapErrorBoundary extends Component<MapBoundaryProps, MapBoundaryState> {
  state: MapBoundaryState = { failed: false };

  static getDerivedStateFromError(): MapBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[PickupMap] map render failed, using fallback:', error.message);
  }

  render() {
    if (this.state.failed) {
      return (
        <View style={{ flex: 1, backgroundColor: cookTheme.bg }}>
          <PickupMapNativeFallback {...this.props.fallbackProps} />
          <View
            style={{
              position: 'absolute',
              bottom: 24,
              left: 16,
              right: 16,
              borderRadius: 12,
              backgroundColor: cookTheme.surface,
              padding: 12,
            }}
          >
            <Text style={{ color: cookTheme.textMuted, fontFamily: 'DMSans_400Regular', fontSize: 12 }}>
              Google Maps could not load. Showing a simplified map instead.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export function PickupMap(props: PickupMapProps) {
  if (!apiKey) {
    return (
      <View style={{ flex: 1, backgroundColor: cookTheme.bg }}>
        <PickupMapNativeFallback {...props} />
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 16,
            right: 16,
            borderRadius: 12,
            backgroundColor: cookTheme.surface,
            padding: 12,
          }}
        >
          <Text style={{ color: cookTheme.textMuted, fontFamily: 'DMSans_400Regular', fontSize: 12 }}>
            Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY for Google Maps on mobile.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <MapErrorBoundary fallbackProps={props}>
        <GooglePickupMap {...props} />
      </MapErrorBoundary>
    </View>
  );
}
