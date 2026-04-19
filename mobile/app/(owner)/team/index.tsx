import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useBusiness } from '@/hooks/useBusiness';
import { colors, typography, spacing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { TeamMember } from '@/types/models';

export default function TeamScreen() {
  const router = useRouter();
  const { team, inviteCashier } = useBusiness();

  const getScoreBand = (score: number | null): { label: string; variant: any } => {
    if (score === null) return { label: 'No data', variant: 'default' };
    if (score >= 85) return { label: 'Excellent', variant: 'success' };
    if (score >= 70) return { label: 'Reliable', variant: 'success' };
    if (score >= 50) return { label: 'Watch', variant: 'warning' };
    if (score >= 30) return { label: 'Urgent', variant: 'warning' };
    return { label: 'Critical', variant: 'error' };
  };

  const renderMember = ({ item }: { item: TeamMember }) => {
    const score = item.score?.overall;
    const band = getScoreBand(score);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(owner)/team/${item.userId}`)}
      >
        <Card style={styles.memberCard}>
          <View style={styles.memberRow}>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{item.name}</Text>
              <Text style={styles.memberPhone}>{item.phone}</Text>
              <View style={styles.badges}>
                <Badge 
                  label={item.role} 
                  variant={item.role === 'owner' ? 'info' : 'default'}
                  size="sm"
                />
                <Badge 
                  label={band.label} 
                  variant={band.variant}
                  size="sm"
                />
              </View>
            </View>
            <ScoreRing score={score} size={56} />
          </View>
          {item.score?.patternNote && (
            <Text style={styles.patternNote}>{item.score.patternNote}</Text>
          )}
          <View style={styles.shiftDots}>
            {item.recentShifts.slice(-7).map((shift, idx) => (
              <View
                key={idx}
                style={[
                  styles.shiftDot,
                  shift.status === 'clean' && styles.shiftDotClean,
                  shift.status === 'mismatch' && styles.shiftDotMismatch,
                  shift.status === 'stock_gap' && styles.shiftDotStock,
                ]}
              />
            ))}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Team</Text>
        <Button
          label="Invite"
          variant="secondary"
          size="sm"
          onPress={() => {}}
        />
      </View>

      <FlatList
        data={team}
        keyExtractor={(item) => item.userId}
        renderItem={renderMember}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No team members yet</Text>
          </Card>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: typography.xxl,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: typography.display,
  },
  list: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  memberCard: {
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: typography.lg,
    fontWeight: '600',
    color: colors.text,
    fontFamily: typography.body,
  },
  memberPhone: {
    fontSize: typography.sm,
    color: colors.sub,
    marginTop: spacing.xs,
    fontFamily: typography.body,
  },
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  patternNote: {
    fontSize: typography.sm,
    color: colors.sub,
    marginTop: spacing.md,
    fontStyle: 'italic',
    fontFamily: typography.body,
  },
  shiftDots: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  shiftDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bg4,
  },
  shiftDotClean: {
    backgroundColor: colors.green,
  },
  shiftDotMismatch: {
    backgroundColor: colors.red,
  },
  shiftDotStock: {
    backgroundColor: colors.amber,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.base,
    color: colors.muted,
    fontFamily: typography.body,
  },
});
