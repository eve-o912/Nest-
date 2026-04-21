import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
  FlatList,
} from 'react-native';
import { useBusinessStore } from '@/store/business.store';
import {
  passportService,
  getPassportStatus,
  getLoanEligibility,
  formatSignalScore,
  calculateTrustTier,
  formatBlockchainTxUrl,
  getShareExpiryWarning,
  type PassportShare,
  type LenderOption,
  type BlockchainAnchor,
} from '@/services/passport.service';
import { Colors, Typography, Spacing } from '@/styles/theme';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { Card } from '@/components/ui/Card';
import type { FinancialPassport } from '@/types/models';

export default function PassportScreen() {
  const { currentBusiness } = useBusinessStore();
  const [passport, setPassport] = useState<FinancialPassport | null>(null);
  const [daysActive, setDaysActive] = useState(0);
  const [isEligible, setIsEligible] = useState(false);
  const [shares, setShares] = useState<PassportShare[]>([]);
  const [lenders, setLenders] = useState<LenderOption[]>([]);
  const [anchor, setAnchor] = useState<BlockchainAnchor | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedLender, setSelectedLender] = useState<LenderOption | null>(null);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'shares' | 'lenders'>('overview');

  const loadPassport = useCallback(async () => {
    if (!currentBusiness?.id) return;
    setIsLoading(true);
    try {
      const response = await passportService.getPassport(currentBusiness.id);
      setPassport(response.passport);
      setDaysActive(response.daysActive);
      setIsEligible(response.isEligible);

      if (response.passport) {
        const [sharesRes, lendersRes, anchorRes] = await Promise.all([
          passportService.getShares(currentBusiness.id),
          passportService.getLenders(),
          passportService.getBlockchainAnchor(currentBusiness.id),
        ]);
        setShares(sharesRes.shares.filter(s => s.isActive));
        setLenders(lendersRes.lenders);
        setAnchor(anchorRes.anchor);
      }
    } catch (err: any) {
      console.error('Failed to load passport:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadPassport();
  }, [loadPassport]);

  const handleShare = (lender: LenderOption) => {
    setSelectedLender(lender);
    setShowShareModal(false);
    setShowPinModal(true);
  };

  const confirmShare = async () => {
    if (!currentBusiness?.id || !selectedLender || pin.length !== 4) return;

    setIsLoading(true);
    try {
      await passportService.shareWithLender(currentBusiness.id, selectedLender.id, pin);
      setShowPinModal(false);
      setPin('');
      loadPassport();
      Alert.alert('Success', `Passport shared with ${selectedLender.name}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to share passport');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (share: PassportShare) => {
    if (!currentBusiness?.id) return;

    Alert.alert(
      'Revoke Access',
      `Are you sure you want to revoke ${share.lenderName}'s access?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await passportService.revokeShare(currentBusiness.id, share.id);
              loadPassport();
              Alert.alert('Success', 'Access revoked');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to revoke');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAnchor = async () => {
    if (!currentBusiness?.id) return;
    setShowPinModal(true);
  };

  const confirmAnchor = async () => {
    if (!currentBusiness?.id || pin.length !== 4) return;

    setIsLoading(true);
    try {
      const response = await passportService.triggerAnchoring(currentBusiness.id, pin);
      setAnchor(response.anchor);
      setShowPinModal(false);
      setPin('');
      Alert.alert('Success', 'Passport anchored to blockchain');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Anchoring failed');
    } finally {
      setIsLoading(false);
    }
  };

  const openExplorer = (txId: string, network: string) => {
    const url = formatBlockchainTxUrl(txId, network);
    Linking.openURL(url);
  };

  const status = getPassportStatus(passport, daysActive);
  const eligibility = getLoanEligibility(passport);
  const trustTier = passport ? calculateTrustTier(passport) : null;

  if (isLoading && !passport) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your Financial Passport...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛂 Financial Passport</Text>
        <Text style={styles.subtitle}>Your verified business identity</Text>
      </View>

      {/* Progress to 60 days */}
      {!passport && (
        <Card style={styles.progressCard}>
          <Text style={styles.progressTitle}>Building Your Passport</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(daysActive / 60) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {daysActive} / 60 days of data collected
          </Text>
          <Text style={styles.progressSubtext}>
            Continue using Nest daily to unlock your passport
          </Text>
        </Card>
      )}

      {/* Passport Score */}
      {passport && (
        <>
          <View style={styles.scoreSection}>
            <ScoreRing score={passport.overallScore} size={150} strokeWidth={12} />
            <Text style={[styles.scoreLabel, { color: formatSignalScore(passport.overallScore).color }]}>
              {formatSignalScore(passport.overallScore).label}
            </Text>
            <Text style={styles.statusText}>{status.message}</Text>
            {trustTier && (
              <View style={[styles.tierBadge, { backgroundColor: getTierColor(trustTier.tier) }]}>
                <Text style={styles.tierText}>{trustTier.tier.toUpperCase()} TIER</Text>
              </View>
            )}
          </View>

          {/* Loan Limit */}
          {eligibility.isEligible && (
            <Card style={styles.loanCard}>
              <Text style={styles.loanLabel}>Pre-approved Loan Limit</Text>
              <Text style={styles.loanAmount}>
                KES {(passport.loanLimit / 100).toLocaleString()}
              </Text>
              <TouchableOpacity
                style={styles.shareButton}
                onPress={() => setShowShareModal(true)}
              >
                <Text style={styles.shareButtonText}>Share with Lender →</Text>
              </TouchableOpacity>
            </Card>
          )}

          {/* Signal Breakdown */}
          <Text style={styles.sectionTitle}>6-Signal Breakdown</Text>
          <Card style={styles.signalsCard}>
            {[
              { name: 'Revenue Consistency', score: passport.revenueScore, weight: '25%' },
              { name: 'Net Margins', score: passport.marginScore, weight: '20%' },
              { name: 'Savings Rate', score: passport.savingsScore, weight: '20%' },
              { name: 'Data Integrity', score: passport.integrityScore, weight: '15%' },
              { name: 'Staff Reliability', score: passport.staffScore, weight: '10%' },
              { name: 'Platform Engagement', score: passport.engagementScore, weight: '10%' },
            ].map((signal) => {
              const formatted = formatSignalScore(signal.score);
              return (
                <View key={signal.name} style={styles.signalRow}>
                  <View style={styles.signalLeft}>
                    <Text style={styles.signalName}>{signal.name}</Text>
                    <Text style={styles.signalWeight}>Weight: {signal.weight}</Text>
                  </View>
                  <View style={styles.signalRight}>
                    <Text style={[styles.signalScore, { color: formatted.color }]}>
                      {signal.score}
                    </Text>
                    <Text style={[styles.signalLabel, { color: formatted.color }]}>
                      {formatted.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>

          {/* Blockchain Anchor */}
          <Text style={styles.sectionTitle}>Blockchain Anchoring</Text>
          <Card style={[styles.anchorCard, anchor?.isAnchored && styles.anchorCardActive]}>
            {anchor?.isAnchored ? (
              <>
                <View style={styles.anchorHeader}>
                  <Text style={styles.anchorIcon}>🔗</Text>
                  <Text style={styles.anchorStatus}>Anchored to {anchor.network.toUpperCase()}</Text>
                </View>
                <Text style={styles.anchorTx}>
                  Tx: {anchor.chainTxId?.slice(0, 20)}...
                </Text>
                <Text style={styles.anchorDate}>
                  Anchored: {new Date(anchor.anchoredAt!).toLocaleDateString('en-KE')}
                </Text>
                {anchor.explorerUrl && (
                  <TouchableOpacity
                    style={styles.explorerButton}
                    onPress={() => openExplorer(anchor.chainTxId!, anchor.network)}
                  >
                    <Text style={styles.explorerButtonText}>View on Explorer →</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <Text style={styles.anchorIcon}>⏳</Text>
                <Text style={styles.anchorTitle}>Not Yet Anchored</Text>
                <Text style={styles.anchorDesc}>
                  Anchor your passport to the blockchain for global verifiability
                </Text>
                <TouchableOpacity
                  style={styles.anchorButton}
                  onPress={handleAnchor}
                >
                  <Text style={styles.anchorButtonText}>Anchor Now</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>

          {/* Data Hash */}
          <Card style={styles.hashCard}>
            <Text style={styles.hashLabel}>SHA-256 Data Hash</Text>
            <Text style={styles.hashValue}>{passport.dataHash.slice(0, 32)}...</Text>
            <Text style={styles.hashSubtext}>
              This hash cryptographically proves your data hasn't been tampered with
            </Text>
          </Card>

          {/* Active Shares */}
          {shares.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Active Lender Shares ({shares.length})</Text>
              {shares.map((share) => {
                const expiry = getShareExpiryWarning(share.expiresAt);
                return (
                  <Card key={share.id} style={styles.shareCard}>
                    <View style={styles.shareHeader}>
                      <Text style={styles.shareLender}>{share.lenderName}</Text>
                      <View style={[styles.expiryBadge, expiry.isExpiringSoon && styles.expiryBadgeWarning]}>
                        <Text style={[styles.expiryText, expiry.isExpiringSoon && styles.expiryTextWarning]}>
                          {expiry.message}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.shareAccess}>
                      Accessed {share.accessCount} times
                      {share.lastAccessedAt && ` • Last: ${new Date(share.lastAccessedAt).toLocaleDateString('en-KE')}`}
                    </Text>
                    <TouchableOpacity
                      style={styles.revokeButton}
                      onPress={() => handleRevoke(share)}
                    >
                      <Text style={styles.revokeButtonText}>Revoke Access</Text>
                    </TouchableOpacity>
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}

      {/* Lender Share Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share with Lender</Text>
            <TouchableOpacity onPress={() => setShowShareModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.shareInfo}>
              Select a lender to share your Financial Passport with. They will receive:
            </Text>

            <View style={styles.sharePreview}>
              <Text style={styles.previewTitle}>Data Preview</Text>
              {passport && (
                <>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Overall Score</Text>
                    <Text style={styles.previewValue}>{passport.overallScore}/100</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Loan Limit</Text>
                    <Text style={styles.previewValue}>KES {(passport.loanLimit / 100).toLocaleString()}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Avg Monthly Revenue</Text>
                    <Text style={styles.previewValue}>KES {(passport.avgMonthlyRevenue / 100).toLocaleString()}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Data Hash</Text>
                    <Text style={styles.previewValue}>{passport.dataHash.slice(0, 16)}...</Text>
                  </View>
                </>
              )}
            </View>

            <Text style={styles.lendersTitle}>Available Lenders</Text>
            {lenders.filter(l => l.isActive).map((lender) => (
              <TouchableOpacity
                key={lender.id}
                style={styles.lenderCard}
                onPress={() => handleShare(lender)}
              >
                <View style={styles.lenderInfo}>
                  <Text style={styles.lenderName}>{lender.name}</Text>
                  <Text style={styles.lenderRates}>
                    Rates: {lender.interestRateRange.min}% - {lender.interestRateRange.max}%
                  </Text>
                  <Text style={styles.lenderLimit}>
                    Max: KES {(lender.maxLoanLimit / 100).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.lenderArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* PIN Confirmation Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPinModal(false);
          setPin('');
        }}
      >
        <View style={styles.pinOverlay}>
          <View style={styles.pinModal}>
            <Text style={styles.pinTitle}>
              {selectedLender ? 'Confirm Share' : 'Confirm Anchoring'}
            </Text>
            <Text style={styles.pinSubtitle}>
              Enter your 4-digit PIN to confirm
            </Text>

            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={Colors.textLight}
            />

            <View style={styles.pinActions}>
              <TouchableOpacity
                style={[styles.pinButton, styles.pinCancel]}
                onPress={() => {
                  setShowPinModal(false);
                  setPin('');
                }}
              >
                <Text style={styles.pinCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pinButton, styles.pinConfirm, pin.length !== 4 && styles.pinConfirmDisabled]}
                onPress={selectedLender ? confirmShare : confirmAnchor}
                disabled={pin.length !== 4 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.pinConfirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getTierColor = (tier: string): string => {
  const colors: Record<string, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
  };
  return colors[tier] || Colors.primary;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: Spacing.md,
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
  progressCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
  },
  progressTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  progressSubtext: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  scoreSection: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  scoreLabel: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    marginTop: Spacing.sm,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  tierBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginTop: Spacing.md,
  },
  tierText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: Typography.sizes.sm,
  },
  loanCard: {
    margin: Spacing.lg,
    marginTop: 0,
    padding: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success,
  },
  loanLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  loanAmount: {
    fontSize: Typography.sizes.hero,
    fontWeight: 'bold',
    color: Colors.success,
    marginVertical: Spacing.sm,
  },
  shareButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  shareButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: Typography.sizes.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  signalsCard: {
    margin: Spacing.lg,
    marginTop: 0,
    padding: Spacing.md,
  },
  signalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  signalLeft: {
    flex: 1,
  },
  signalName: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
  signalWeight: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  signalRight: {
    alignItems: 'flex-end',
  },
  signalScore: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
  },
  signalLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
  anchorCard: {
    margin: Spacing.lg,
    marginTop: 0,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  anchorCardActive: {
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success,
  },
  anchorIcon: {
    fontSize: 32,
    marginBottom: Spacing.sm,
  },
  anchorTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  anchorDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  anchorButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  anchorButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  anchorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  anchorStatus: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.success,
  },
  anchorTx: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontFamily: 'monospace',
  },
  anchorDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  explorerButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  explorerButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  hashCard: {
    margin: Spacing.lg,
    marginTop: 0,
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  hashLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  hashValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'monospace',
    color: Colors.text,
  },
  hashSubtext: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.sm,
  },
  shareCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  shareLender: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  expiryBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
  },
  expiryBadgeWarning: {
    backgroundColor: Colors.error + '20',
  },
  expiryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.success,
  },
  expiryTextWarning: {
    color: Colors.error,
  },
  shareAccess: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  revokeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.error + '20',
    borderWidth: 1,
    borderColor: Colors.error,
  },
  revokeButtonText: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: Typography.sizes.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  closeButton: {
    fontSize: Typography.sizes.xl,
    color: Colors.textLight,
    padding: Spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  shareInfo: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  sharePreview: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  previewLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  previewValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  lendersTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  lenderCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lenderInfo: {
    flex: 1,
  },
  lenderName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  lenderRates: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  lenderLimit: {
    fontSize: Typography.sizes.sm,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  lenderArrow: {
    fontSize: 24,
    color: Colors.primary,
  },
  pinOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  pinModal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  pinTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  pinSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
  },
  pinInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 8,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 12,
    width: 160,
    marginBottom: Spacing.lg,
  },
  pinActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  pinButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  pinCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pinCancelText: {
    color: Colors.text,
    fontWeight: '600',
  },
  pinConfirm: {
    backgroundColor: Colors.primary,
  },
  pinConfirmDisabled: {
    opacity: 0.5,
  },
  pinConfirmText: {
    color: Colors.white,
    fontWeight: '600',
  },
});
