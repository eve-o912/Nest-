import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '@/constants/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export function Badge({ label, variant = 'default', size = 'md' }: BadgeProps) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'success':
        return colors.greenDim;
      case 'warning':
        return colors.amberDim;
      case 'error':
        return colors.redDim;
      case 'info':
        return colors.blueDim;
      default:
        return colors.bg4;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'success':
        return colors.green;
      case 'warning':
        return colors.amber;
      case 'error':
        return colors.red;
      case 'info':
        return colors.blue;
      default:
        return colors.sub;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getBackgroundColor(),
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.md,
          paddingVertical: size === 'sm' ? spacing.xs : spacing.sm,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: getTextColor(),
            fontSize: size === 'sm' ? typography.xs : typography.sm,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
    fontFamily: typography.body,
  },
});
