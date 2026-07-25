import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { cookTheme } from '../theme/cookTheme';

type Props = {
  children: ReactNode;
  title?: string;
  fallback?: ReactNode;
  onRetry?: () => void;
};

type State = {
  error: Error | null;
};

export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ScreenErrorBoundary]', error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: cookTheme.bg }}
        >
          <Text className="text-[18px] text-white" style={{ fontFamily: 'Syne_700Bold' }}>
            {this.props.title ?? 'Something went wrong'}
          </Text>
          <Text
            className="mt-2 text-center text-[14px] leading-5"
            style={{ fontFamily: 'DMSans_400Regular', color: cookTheme.textMuted }}
          >
            {this.state.error.message || 'This screen hit an unexpected error.'}
          </Text>
          <Pressable
            onPress={this.retry}
            className="mt-4 rounded-xl px-5 py-2.5"
            style={{ backgroundColor: cookTheme.accent }}
          >
            <Text className="text-[14px] text-white" style={{ fontFamily: 'DMSans_600SemiBold' }}>
              Try again
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
