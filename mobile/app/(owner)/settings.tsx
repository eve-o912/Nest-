import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useBusinessStore } from '@/store/business.store';
import { useAuthStore } from '@/store/auth.store';
import {
  settingsService,
  getLanguageName,
  getCurrencySymbol,
  getCountryName,
  getBusinessTypeName,
  getPaymentMethodIcon,
  getPaymentMethodName,
  getSessionDuration,
  validatePin,
  type BusinessSettings,
  type NotificationSettings,
  type PaymentMethod,
  type ActiveSession,
  type Language,
  type Currency,
  type Country,
} from '@/services/settings.service';
import { Colors, Typography, Spacing } from '@/styles/theme';
import { Card } from '@/components/ui/Card';

export default function SettingsScreen() {
  const { currentBusiness } = useBusinessStore();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'business' | 'notifications' | 'security'>('business');
  const [isLoading, setIsLoading] = useState(false);
  
  // Settings state
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    name: '',
    type: 'retail',
    currency: 'KES',
    country: 'KE',
    timezone: 'Africa/Nairobi',
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    whatsappEnabled: true,
    smsEnabled: true,
    emailEnabled: false,
    cashMismatch: true,
    lowStock: true,
    dailyCloseReminder: true,
    weeklyInsight: true,
    scoreDrop: true,
    loanMilestone: true,
    passportAccess: true,
    stockDiscrepancy: true,
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  
  // PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'setup' | 'change'>('setup');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const loadSettings = useCallback(async () => {
    if (!currentBusiness?.id || !user?.id) return;
    setIsLoading(true);
    try {
      const [businessRes, notificationRes, methodsRes, sessionsRes] = await Promise.all([
        settingsService.getBusinessSettings(currentBusiness.id),
        settingsService.getNotificationSettings(currentBusiness.id),
        settingsService.getPaymentMethods(currentBusiness.id),
        settingsService.getActiveSessions(user.id),
      ]);
      setBusinessSettings(businessRes.settings);
      setNotificationSettings(notificationRes.settings);
      setPaymentMethods(methodsRes.methods);
      setSessions(sessionsRes.sessions);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id, user?.id]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveBusiness = async () => {
    if (!currentBusiness?.id) return;
    setIsLoading(true);
    try {
      await settingsService.updateBusinessSettings(currentBusiness.id, businessSettings);
      Alert.alert('Success', 'Business settings saved');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotification = async (key: keyof NotificationSettings) => {
    if (!currentBusiness?.id) return;
    const updated = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(updated);
    try {
      await settingsService.updateNotificationSettings(currentBusiness.id, { [key]: updated[key] });
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update notification setting');
      setNotificationSettings(notificationSettings);
    }
  };

  const handleTogglePaymentMethod = async (method: PaymentMethod) => {
    if (!currentBusiness?.id) return;
    const updated = { ...method, isActive: !method.isActive };
    try {
      await settingsService.updatePaymentMethod(currentBusiness.id, method.id, { isActive: updated.isActive });
      setPaymentMethods(paymentMethods.map(m => m.id === method.id ? updated : m));
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update payment method');
    }
  };

  const handleRevokeSession = async (session: ActiveSession) => {
    if (!user?.id) return;
    Alert.alert(
      'Revoke Session',
      `Are you sure you want to revoke access for ${session.deviceName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await settingsService.revokeSession(user.id, session.id);
              setSessions(sessions.filter(s => s.id !== session.id));
              Alert.alert('Success', 'Session revoked');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to revoke session');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await settingsService.signOut();
          }
        }
      ]
    );
  };

  const handleSetupPin = () => {
    setPinMode('setup');
    setPin('');
    setConfirmPin('');
    setShowPinModal(true);
  };

  const handleChangePin = () => {
    setPinMode('change');
    setPin('');
    setConfirmPin('');
    setShowPinModal(true);
  };

  const savePin = async () => {
    if (!user?.id) return;
    
    const validation = validatePin(pin);
    if (!validation.isValid) {
      Alert.alert('Invalid PIN', validation.error);
      return;
    }
    
    if (pin !== confirmPin) {
      Alert.alert('PIN Mismatch', 'PINs do not match');
      return;
    }

    setIsLoading(true);
    try {
      await settingsService.setupPin(user.id, pin);
      setShowPinModal(false);
      Alert.alert('Success', 'PIN set successfully');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to set PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const renderBusinessTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Business Name */}
      <Card style={styles.settingCard}>
        <Text style={styles.settingLabel}>Business Name</Text>
        <TextInput
          style={styles.textInput}
          value={businessSettings.name}
          onChangeText={(text) => setBusinessSettings({ ...businessSettings, name: text })}
          placeholder="Enter business name"
        />
      </Card>

      {/* Business Type */}
      <Card style={styles.settingCard}>
        <Text style={styles.settingLabel}>Business Type</Text>
        <View style={styles.optionsGrid}>
          {(['retail', 'wholesale', 'services', 'food', 'other'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.optionChip,
                businessSettings.type === type && styles.optionChipActive
              ]}
              onPress={() => setBusinessSettings({ ...businessSettings, type })}
            >
              <Text style={[
                styles.optionChipText,
                businessSettings.type === type && styles.optionChipTextActive
              ]}>
                {getBusinessTypeName(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Currency & Country */}
      <Card style={styles.settingCard}>
        <Text style={styles.settingLabel}>Currency & Country</Text>
        <View style={styles.optionsRow}>
          {(['KES', 'UGX', 'TZS', 'NGN'] as Currency[]).map((currency) => (
            <TouchableOpacity
              key={currency}
              style={[
                styles.currencyChip,
                businessSettings.currency === currency && styles.currencyChipActive
              ]}
              onPress={() => setBusinessSettings({ ...businessSettings, currency })}
            >
              <Text style={[
                styles.currencyChipText,
                businessSettings.currency === currency && styles.currencyChipTextActive
              ]}>
                {getCurrencySymbol(currency)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.countryRow}>
          {(['KE', 'UG', 'TZ', 'NG'] as Country[]).map((country) => (
            <TouchableOpacity
              key={country}
              style={[
                styles.countryChip,
                businessSettings.country === country && styles.countryChipActive
              ]}
              onPress={() => setBusinessSettings({ ...businessSettings, country })}
            >
              <Text style={[
                styles.countryChipText,
                businessSettings.country === country && styles.countryChipTextActive
              ]}>
                {getCountryName(country)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Payment Methods */}
      <Card style={styles.settingCard}>
        <Text style={styles.settingLabel}>Accepted Payment Methods</Text>
        {paymentMethods.map((method) => (
          <View key={method.id} style={styles.paymentRow}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentIcon}>{getPaymentMethodIcon(method.type)}</Text>
              <Text style={styles.paymentName}>{getPaymentMethodName(method.type)}</Text>
            </View>
            <Switch
              value={method.isActive}
              onValueChange={() => handleTogglePaymentMethod(method)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>
        ))}
      </Card>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveBusiness}>
        <Text style={styles.saveButtonText}>Save Business Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderNotificationsTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* Notification Channels */}
      <Card style={styles.settingCard}>
        <Text style={styles.settingLabel}>Notification Channels</Text>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>📱 Push Notifications</Text>
            <Text style={styles.toggleDescription}>Instant alerts on your device</Text>
          </View>
          <Switch
            value={notificationSettings.pushEnabled}
            onValueChange={() => handleToggleNotification('pushEnabled')}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>💬 WhatsApp</Text>
            <Text style={styles.toggleDescription}>Daily and weekly summaries</Text>
          </View>
          <Switch
            value={notificationSettings.whatsappEnabled}
            onValueChange={() => handleToggleNotification('whatsappEnabled')}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>📩 SMS Fallback</Text>
            <Text style={styles.toggleDescription}>When WhatsApp fails</Text>
          </View>
          <Switch
            value={notificationSettings.smsEnabled}
            onValueChange={() => handleToggleNotification('smsEnabled')}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View>
      </Card>

      {/* Alert Types */}
      <Card style={styles.settingCard}>
        <Text style={styles.settingLabel}>Alert Types</Text>
        {[
          { key: 'cashMismatch', label: '💰 Cash Mismatch', desc: 'When |cash variance| > KES 5' },
          { key: 'lowStock', label: '📦 Low Stock', desc: 'When stock reaches reorder level' },
          { key: 'dailyCloseReminder', label: '🌙 Daily Close Reminder', desc: 'At 8pm if not closed' },
          { key: 'weeklyInsight', label: '📊 Weekly P&L Insight', desc: 'Monday 7am AI summary' },
          { key: 'scoreDrop', label: '⚠️ Score Drop', desc: 'When cashier score < 50' },
          { key: 'loanMilestone', label: '🎯 Loan Milestone', desc: 'When limit crosses threshold' },
          { key: 'passportAccess', label: '🔍 Passport Access', desc: 'When lender queries passport' },
          { key: 'stockDiscrepancy', label: '🚨 Stock Discrepancy', desc: 'After physical count gap' },
        ].map(({ key, label, desc }) => (
          <View key={key} style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>{label}</Text>
              <Text style={styles.toggleDescription}>{desc}</Text>
            </View>
            <Switch
              value={notificationSettings[key as keyof NotificationSettings] as boolean}
              onValueChange={() => handleToggleNotification(key as keyof NotificationSettings)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
            />
          </View>
        ))}
      </Card>
    </ScrollView>
  );

  const renderSecurityTab = () => (
    <ScrollView style={styles.tabContent}>
      {/* PIN Management */}
      <Card style={styles.settingCard}>
        <Text style={styles.settingLabel}>🔐 PIN Security</Text>
        <Text style={styles.settingDescription}>
          Your 4-digit PIN is required for sensitive actions like sharing your passport or anchoring to blockchain.
        </Text>
        <View style={styles.pinActions}>
          <TouchableOpacity style={styles.pinButton} onPress={handleSetupPin}>
            <Text style={styles.pinButtonText}>Set Up PIN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pinButton} onPress={handleChangePin}>
            <Text style={styles.pinButtonText}>Change PIN</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Active Sessions */}
      <Card style={styles.settingCard}>
        <Text style={styles.settingLabel}>📱 Active Sessions</Text>
        <Text style={styles.settingDescription}>
          Devices currently logged into your account. Revoke any you don't recognize.
        </Text>
        {sessions.map((session) => (
          <View key={session.id} style={styles.sessionRow}>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionDevice}>
                {session.deviceType === 'ios' ? '🍎' : session.deviceType === 'android' ? '🤖' : '🌐'} {session.deviceName}
                {session.isCurrent && <Text style={styles.currentBadge}> (Current)</Text>}
              </Text>
              <Text style={styles.sessionMeta}>
                {session.ipAddress} • {getSessionDuration(session.lastActiveAt)}
              </Text>
            </View>
            {!session.isCurrent && (
              <TouchableOpacity 
                style={styles.revokeButton}
                onPress={() => handleRevokeSession(session)}
              >
                <Text style={styles.revokeButtonText}>Revoke</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </Card>

      {/* Language */}
      <Card style={styles.settingCard}>
        <Text style={styles.settingLabel}>🌍 Language</Text>
        <View style={styles.optionsRow}>
          {(['en', 'sw'] as Language[]).map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.langChip,
                user?.preferredLanguage === lang && styles.langChipActive
              ]}
              onPress={async () => {
                if (user?.id) {
                  await settingsService.setLanguage(user.id, lang);
                }
              }}
            >
              <Text style={[
                styles.langChipText,
                user?.preferredLanguage === lang && styles.langChipTextActive
              ]}>
                {getLanguageName(lang)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Settings</Text>
        <Text style={styles.subtitle}>Manage your business and preferences</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'business' && styles.tabActive]}
          onPress={() => setActiveTab('business')}
        >
          <Text style={[styles.tabText, activeTab === 'business' && styles.tabTextActive]}>
            🏢 Business
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
            🔔 Alerts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'security' && styles.tabActive]}
          onPress={() => setActiveTab('security')}
        >
          <Text style={[styles.tabText, activeTab === 'security' && styles.tabTextActive]}>
            🔐 Security
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'business' && renderBusinessTab()}
      {activeTab === 'notifications' && renderNotificationsTab()}
      {activeTab === 'security' && renderSecurityTab()}

      {/* PIN Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {pinMode === 'setup' ? 'Set Up PIN' : 'Change PIN'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Enter a 4-digit PIN (not sequential or repeating)
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

            <TextInput
              style={styles.pinInput}
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="Confirm PIN"
              placeholderTextColor={Colors.textLight}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setShowPinModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirm, (pin.length !== 4 || pin !== confirmPin) && styles.modalConfirmDisabled]}
                onPress={savePin}
                disabled={pin.length !== 4 || pin !== confirmPin || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  tabTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  settingCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  settingLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  settingDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  optionChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  currencyChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currencyChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  currencyChipText: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  currencyChipTextActive: {
    color: Colors.white,
  },
  countryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  countryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  countryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  countryChipText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
  },
  countryChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  paymentIcon: {
    fontSize: 24,
  },
  paymentName: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toggleInfo: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  toggleLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  pinActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  pinButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  pinButtonText: {
    color: Colors.white,
    fontWeight: '600',
  },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  currentBadge: {
    color: Colors.success,
    fontWeight: '600',
  },
  sessionMeta: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  revokeButton: {
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  revokeButtonText: {
    color: Colors.error,
    fontWeight: '600',
  },
  langChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  langChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langChipText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  langChipTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: Colors.error + '20',
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutButtonText: {
    color: Colors.error,
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
    textAlign: 'center',
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
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelText: {
    color: Colors.text,
    fontWeight: '600',
  },
  modalConfirm: {
    backgroundColor: Colors.primary,
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    color: Colors.white,
    fontWeight: '600',
  },
});
