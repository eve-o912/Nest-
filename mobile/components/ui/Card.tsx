import { View, StyleSheet, ViewProps, ReactNode } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children?: ReactNode;
  style?: any;
}

export function Card({
  children,
  elevated = false,
  padding = 'md',
  style,
  ...props
}: CardProps) {
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing.sm;
      case 'lg':
        return spacing.lg;
      default:
        return spacing.md;
    }
  };

  return (
    <View
      style={[
        styles.card,
        elevated && styles.elevated,
        { padding: getPadding() },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  elevated: {
    backgroundColor: colors.bg3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
