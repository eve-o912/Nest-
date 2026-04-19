import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, typography, spacing, radius } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  size = 'md',
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return colors.accent;
      case 'secondary':
        return colors.bg4;
      case 'ghost':
        return 'transparent';
      case 'danger':
        return colors.redDim;
      default:
        return colors.accent;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.bg;
      case 'secondary':
        return colors.text;
      case 'ghost':
        return colors.accent;
      case 'danger':
        return colors.red;
      default:
        return colors.bg;
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md };
      case 'lg':
        return { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl };
      default:
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return typography.sm;
      case 'lg':
        return typography.lg;
      default:
        return typography.base;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.accent,
          ...getPadding(),
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={[styles.label, { color: getTextColor(), fontSize: getFontSize() }]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontWeight: '600',
    fontFamily: typography.body,
  },
});
