import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, FlatList } from 'react-native';
import { useBusinessStore } from '@/store/business.store';
import { teamService, getScoreColor, getScoreLabel, formatSignalName, getShiftDotColor, calculateWeightedScore, type CashierScore, type ShiftHistory, type TeamMember } from '@/services/team.service';
import { Colors, Typography, Spacing } from '@/styles/theme';
import { ScoreRing } from '@/components/ui/ScoreRing';

export default function TeamScreen() {
  const { currentBusiness } = useBusinessStore();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedCashier, setSelectedCashier] = useState<TeamMember | null>(null);
  const [shiftHistory, setShiftHistory] = useState<ShiftHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadTeam = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setIsLoading(true);
    try {
      const response = await teamService.getTeam(currentBusiness.id);
      setTeam(response.team || []);
    } catch (err: any) {
      console.error('Failed to load team:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const handleViewDetail = async (member: TeamMember) => {
    if (!currentBusiness?.id) return;
    setSelectedCashier(member);
    setIsLoading(true);
    try {
      const historyResponse = await teamService.getShiftHistory(currentBusiness.id, member.id);
      setShiftHistory(historyResponse.shifts || []);
      setShowDetailModal(true);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load shift history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (member: TeamMember) => {
    if (!currentBusiness?.id) return;
    
    const action = member.isActive ? 'restrict' : 'restore';
    Alert.alert(
      `${action === 'restrict' ? 'Restrict' : 'Restore'} Access`,
      `Are you sure you want to ${action} access for ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'restrict' ? 'Restrict' : 'Restore',
          style: action === 'restrict' ? 'destructive' : 'default',
          onPress: async () => {
            setIsLoading(true);
            try {
              await teamService.toggleUserStatus(currentBusiness.id, member.id, !member.isActive);
              loadTeam();
              Alert.alert('Success', `${member.name}'s access has been ${action}ed`);
            } catch (err: any) {
              Alert.alert('Error', err.message || `Failed to ${action} access`);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderScoreRing = (score: number, size: number = 60) => (
    <View style={styles.scoreContainer}>
      <ScoreRing score={score} size={size} strokeWidth={6} />
      <Text style={[styles.scoreLabel, { color: getScoreColor(score) }]}>
        {getScoreLabel(score)}
      </Text>
    </View>
  );

  const renderShiftDots = (shifts: ShiftHistory[]) => (
    <View style={styles.dotsContainer}>
      {shifts.slice(0, 30).map((shift, index) => (
        <View
          key={shift.id}
          style={[styles.shiftDot, { backgroundColor: getShiftDotColor(shift) }]}
        />
      ))}
      {shifts.length > 30 && (
        <Text style={styles.moreDots}>+{shifts.length - 30}</Text>
      )}
    </View>
  );

  const renderCashierCard = ({ item }: { item: TeamMember }) => {
    const score = item.score;
    const hasLowScore = score && score.overallScore < 60;
    
    return (
      <TouchableOpacity 
        style={[styles.card, hasLowScore && styles.cardWarning]}
        onPress={() => handleViewDetail(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameSection}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
            {!item.isActive && (
              <View style={styles.restrictedBadge}>
                <Text style={styles.restrictedText}>🔒 Restricted</Text>
              </View>
            )}
          </View>
          
          {score ? (
            renderScoreRing(score.overallScore)
          ) : (
            <Text style={styles.noScore}>No score</Text>
          )}
        </View>

        {score && (
          <>
            <View style={styles.dotsSection}>
              <Text style={styles.dotsLabel}>Last 30 shifts</Text>
              {renderShiftDots(shiftHistory.filter(s => s.id.startsWith(item.id)) || [])}
            </View>

            <View style={styles.signalPreview}>
              {Object.entries({
                'Cash': score.cashAccuracyScore,
                'Stock': score.stockIntegrityScore,
                'Record': score.recordingQualityScore,
              }).map(([label, value]) => (
                <View key={label} style={styles.signalItem}>
                  <Text style={styles.signalLabel}>{label}</Text>
                  <View style={styles.signalBar}>
                    <View style={[styles.signalFill, { width: `${value}%`, backgroundColor: getScoreColor(value) }]} />
                  </View>
                  <Text style={styles.signalValue}>{value}</Text>
                </View>
              ))}
            </View>

            {score.patternNote && (
              <View style={styles.patternBanner}>
                <Text style={styles.patternText}>📊 {score.patternNote}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.detailButton]}
            onPress={() => handleViewDetail(item)}
          >
            <Text style={styles.detailButtonText}>View Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, item.isActive ? styles.restrictButton : styles.restoreButton]}
            onPress={() => handleToggleStatus(item)}
          >
            <Text style={item.isActive ? styles.restrictButtonText : styles.restoreButtonText}>
              {item.isActive ? '🔒 Restrict' : '🔓 Restore'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Team & Cashier Scores</Text>
          <Text style={styles.subtitle}>Reliability scores from 5 weighted signals</Text>
        </View>
      </View>

      {/* Team Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{team.length}</Text>
          <Text style={styles.statLabel}>Team Size</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {team.filter(m => m.score && m.score.overallScore >= 85).length}
          </Text>
          <Text style={styles.statLabel}>Top Performers</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, styles.warningValue]}>
            {team.filter(m => m.score && m.score.overallScore < 60).length}
          </Text>
          <Text style={styles.statLabel}>At Risk</Text>
        </View>
      </View>

      {/* Scoring Legend */}
      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>5-Signal Scoring (0-100)</Text>
        <View style={styles.legendGrid}>
          <View style={styles.legendItem}>
            <Text style={styles.legendWeight}>35%</Text>
            <Text style={styles.legendName}>Cash Accuracy</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendWeight}>25%</Text>
            <Text style={styles.legendName}>Stock Integrity</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendWeight}>20%</Text>
            <Text style={styles.legendName}>Recording Quality</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendWeight}>15%</Text>
            <Text style={styles.legendName}>Void Behaviour</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={styles.legendWeight}>5%</Text>
            <Text style={styles.legendName}>Receipt Delivery</Text>
          </View>
        </View>
      </View>

      {/* Team List */}
      {isLoading && team.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={team}
          renderItem={renderCashierCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No team members yet</Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{selectedCashier?.name}</Text>
              <Text style={styles.modalSubtitle}>Cashier Performance Detail</Text>
            </View>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCashier?.score && (
              <>
                {/* Overall Score */}
                <View style={styles.detailScoreSection}>
                  <ScoreRing score={selectedCashier.score.overallScore} size={120} strokeWidth={10} />
                  <Text style={[styles.detailScoreLabel, { color: getScoreColor(selectedCashier.score.overallScore) }]}>
                    {getScoreLabel(selectedCashier.score.overallScore)}
                  </Text>
                  <Text style={styles.detailScoreSubtext}>
                    Based on {selectedCashier.score.shiftCount} shifts
                  </Text>
                </View>

                {/* Signal Breakdown */}
                <Text style={styles.sectionTitle}>5-Signal Breakdown</Text>
                <View style={styles.signalsCard}>
                  {[
                    { name: 'Cash Accuracy', value: selectedCashier.score.cashAccuracyScore, weight: 35 },
                    { name: 'Stock Integrity', value: selectedCashier.score.stockIntegrityScore, weight: 25 },
                    { name: 'Recording Quality', value: selectedCashier.score.recordingQualityScore, weight: 20 },
                    { name: 'Void Behaviour', value: selectedCashier.score.voidBehaviourScore, weight: 15 },
                    { name: 'Receipt Delivery', value: selectedCashier.score.receiptDeliveryScore, weight: 5 },
                  ].map((signal) => (
                    <View key={signal.name} style={styles.signalRow}>
                      <View style={styles.signalHeader}>
                        <Text style={styles.signalName}>{signal.name}</Text>
                        <Text style={styles.signalWeight}>{signal.weight}% weight</Text>
                      </View>
                      <View style={styles.signalBarLarge}>
                        <View 
                          style={[
                            styles.signalFillLarge, 
                            { 
                              width: `${signal.value}%`, 
                              backgroundColor: getScoreColor(signal.value) 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.signalScoreLarge}>{signal.value}/100</Text>
                    </View>
                  ))}
                </View>

                {/* Estimated Loss */}
                {selectedCashier.score.totalEstimatedLoss > 0 && (
                  <View style={styles.lossCard}>
                    <Text style={styles.lossLabel}>Total Estimated Loss</Text>
                    <Text style={styles.lossAmount}>
                      KES {selectedCashier.score.totalEstimatedLoss.toLocaleString()}
                    </Text>
                  </View>
                )}

                {/* Pattern Detection */}
                {selectedCashier.score.patternNote && (
                  <View style={styles.patternCard}>
                    <Text style={styles.patternTitle}>📊 Detected Pattern</Text>
                    <Text style={styles.patternDetail}>{selectedCashier.score.patternNote}</Text>
                  </View>
                )}

                {/* Shift History (30 dots) */}
                <Text style={styles.sectionTitle}>30-Shift History</Text>
                <View style={styles.historyCard}>
                  <View style={styles.dotsGrid}>
                    {shiftHistory.slice(0, 30).map((shift, index) => (
                      <View key={shift.id} style={styles.historyDotWrapper}>
                        <View
                          style={[
                            styles.historyDot, 
                            { backgroundColor: getShiftDotColor(shift) }
                          ]}
                        />
                        <Text style={styles.dotNumber}>{index + 1}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.dotsLegend}>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
                      <Text style={styles.legendText}>Clean shift</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                      <Text style={styles.legendText}>Minor issues</Text>
                    </View>
                    <View style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                      <Text style={styles.legendText}>Flagged</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.detailActions}>
                  <TouchableOpacity 
                    style={styles.evidenceButton}
                    onPress={() => {
                      Alert.alert('Evidence', 'Download full evidence report for this cashier');
                    }}
                  >
                    <Text style={styles.evidenceButtonText}>📥 Download Evidence</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  warningValue: {
    color: Colors.error,
  },
  legendCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legendItem: {
    width: '30%',
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: 8,
  },
  legendWeight: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  legendName: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardWarning: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  phone: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  restrictedBadge: {
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  restrictedText: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  noScore: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  dotsSection: {
    marginBottom: Spacing.md,
  },
  dotsLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  dotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  shiftDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moreDots: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  signalPreview: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  signalItem: {
    flex: 1,
  },
  signalLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  signalBar: {
    height: 4,
    backgroundColor: Colors.background,
    borderRadius: 2,
    marginVertical: Spacing.xs,
    overflow: 'hidden',
  },
  signalFill: {
    height: '100%',
    borderRadius: 2,
  },
  signalValue: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.text,
  },
  patternBanner: {
    backgroundColor: '#FEF3C7',
    padding: Spacing.sm,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  patternText: {
    fontSize: Typography.sizes.sm,
    color: '#92400E',
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailButton: {
    backgroundColor: Colors.primary,
  },
  detailButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  restrictButton: {
    backgroundColor: Colors.error + '20',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  restrictButtonText: {
    color: Colors.error,
    fontWeight: '600',
  },
  restoreButton: {
    backgroundColor: Colors.success + '20',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  restoreButtonText: {
    color: Colors.success,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  closeButton: {
    fontSize: Typography.sizes.xl,
    color: Colors.textLight,
    padding: Spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  detailScoreSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  detailScoreLabel: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    marginTop: Spacing.sm,
  },
  detailScoreSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  signalsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  signalRow: {
    marginBottom: Spacing.md,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  signalName: {
    fontSize: Typography.sizes.md,
    fontWeight: '500',
    color: Colors.text,
  },
  signalWeight: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  signalBarLarge: {
    height: 12,
    backgroundColor: Colors.background,
    borderRadius: 6,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  signalFillLarge: {
    height: '100%',
    borderRadius: 6,
  },
  signalScoreLarge: {
    fontSize: Typography.sizes.md,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'right',
  },
  lossCard: {
    backgroundColor: Colors.error + '15',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  lossLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.error,
  },
  lossAmount: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  patternCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  patternTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: Spacing.xs,
  },
  patternDetail: {
    fontSize: Typography.sizes.base,
    color: '#92400E',
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  historyDotWrapper: {
    alignItems: 'center',
  },
  historyDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 2,
  },
  dotNumber: {
    fontSize: 8,
    color: Colors.textLight,
  },
  dotsLegend: {
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  detailActions: {
    marginBottom: Spacing.xl,
  },
  evidenceButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  evidenceButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
});
