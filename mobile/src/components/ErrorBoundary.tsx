import React from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

function Fallback({ onRetry }: { onRetry: () => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
      <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
        Something went wrong.
      </Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 4 }}>
        Please restart the app.
      </Text>
      <Button label="Try again" variant="outline" onPress={onRetry} />
    </View>
  );
}

/** Last-resort catch-all for uncaught render errors — shows a static message instead of a white-screen crash. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <Fallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
