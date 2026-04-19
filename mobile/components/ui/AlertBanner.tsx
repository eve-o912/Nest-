import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, radius } from '@/constants/theme';

type AlertSeverity = 'info' | 'warning' | 'error' | 'success';

interface AlertBannerProps {
  title: string;
  body?: string;
  severity?: AlertSeverity;
  onDismiss?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function AlertBanner({
  title,
  body,
  severity = 'info',
  onDismiss,
  action,
}: AlertBannerProps) {
  const getBackgroundColor = () => {
    switch (severity) {
      case 'success':
        return colors.greenDim;
      case 'warning':
        return colors.amberDim;
      case 'error':
        return colors.redDim;
      default:
        return colors.blueDim;
    }
  };

  const getBorderColor = () => {
    switch (severity) {
      case 'success':
        return colors.green;
      case 'warning':
        return colors.amber;
      case 'error':
        return colors.red;
      default:
        return colors.blue;
    }
  };

  const getIcon = () => {
    switch (severity) {
      case 'success':
        return '✓';
      case 'warning':
        return '!';
      case 'error':
        return '✕';
      default:
        return 'ℹ';
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.icon, { color: getBorderColor() }]}>{getIcon()}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {body && <Text style={styles.body}>{body}</Text>}
        </View>
      </View>
      <View style={styles.actions}>
        {action && (
          <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
            <Text style={[styles.actionText, { color: getBorderColor() }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  content: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  icon: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 24,
    textAlign: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.base,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  body: {
    fontSize: typography.sm,
    color: colors.sub,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginLeft: 40,
  },
  actionButton: {
    paddingVertical: spacing.xs,
  },
  actionText: {
    fontSize: typography.sm,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  dismissText: {
    fontSize: 16,
    color: colors.muted,
  },
});
