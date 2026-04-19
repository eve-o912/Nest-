import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '@/constants/theme';
import { formatMoney, formatMoneyShort } from '@/constants/theme';

type StatColor = 'default' | 'accent' | 'green' | 'red' | 'amber';

interface StatCardProps {
  label: string;
  value: number;
  subtext?: string;
  color?: StatColor;
  showProgress?: boolean;
  progress?: number; // 0-1
  isMoney?: boolean;
  compact?: boolean;
}

export function StatCard({
  label,
  value,
  subtext,
  color = 'default',
  showProgress = false,
  progress = 0,
  isMoney = true,
  compact = false,
}: StatCardProps) {
  const getValueColor = () => {
    switch (color) {
      case 'accent':
        return colors.accent;
      case 'green':
        return colors.green;
      case 'red':
        return colors.red;
      case 'amber':
        return colors.amber;
      default:
        return colors.text;
    }
  };

  const getProgressColor = () => {
    switch (color) {
      case 'green':
        return colors.green;
      case 'red':
        return colors.red;
      case 'amber':
        return colors.amber;
      default:
        return colors.accent;
    }
  };

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: getValueColor(), fontSize: compact ? typography.xl : typography.xxl }]}>
        {isMoney ? (compact ? formatMoneyShort(value) : formatMoney(value)) : value.toLocaleString()}
      </Text>
      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.bg4 }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(0, Math.min(100, progress * 100))}%`,
                  backgroundColor: getProgressColor(),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg2,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    minWidth: 140,
  },
  compact: {
    padding: spacing.sm,
    minWidth: 100,
  },
  label: {
    fontSize: typography.sm,
    color: colors.sub,
    marginBottom: spacing.xs,
    fontFamily: typography.body,
  },
  value: {
    fontWeight: 'bold',
    fontFamily: typography.mono,
  },
  subtext: {
    fontSize: typography.xs,
    color: colors.muted,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: typography.xs,
    color: colors.sub,
    fontFamily: typography.mono,
  },
});
