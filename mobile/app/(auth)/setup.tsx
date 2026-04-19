import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { businessApi } from '@/services/api.service';
import { Colors, Typography, Spacing } from '@/styles/theme';

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Shop', icon: '🏪' },
  { value: 'wholesale', label: 'Wholesale', icon: '📦' },
  { value: 'service', label: 'Service Business', icon: '🔧' },
  { value: 'food', label: 'Food & Restaurant', icon: '🍽️' },
  { value: 'other', label: 'Other', icon: '🏢' },
];

export default function SetupScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [ownerName, setOwnerName] = useState(user?.name || '');
  const [autoSaveRate, setAutoSaveRate] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNext = () => {
    setError('');
    
    if (step === 1 && !ownerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (step === 2 && !businessName.trim()) {
      setError('Please enter your business name');
      return;
    }
    
    if (step === 3 && !businessType) {
      setError('Please select a business type');
      return;
    }
    
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await businessApi.createBusiness({
        name: businessName,
        businessType,
        autoSaveRate,
        currency: 'KES',
        timezone: 'Africa/Nairobi',
      });
      
      if (response.success) {
        // Update user with business info
        if (user) {
          setUser({
            ...user,
            name: ownerName,
            businessId: response.data.business.id,
            role: 'owner',
          });
        }
        
        // Navigate to owner dashboard
        router.replace('/(owner)/dashboard');
      } else {
        setError(response.error?.message || 'Failed to create business');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create business');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>What's your name?</Text>
            <Text style={styles.stepSubtitle}>
              This helps us personalize your experience
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={ownerName}
              onChangeText={setOwnerName}
              autoFocus
            />
          </>
        );
        
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>What's your business name?</Text>
            <Text style={styles.stepSubtitle}>
              This will appear on receipts and reports
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Business name"
              value={businessName}
              onChangeText={setBusinessName}
              autoFocus
            />
          </>
        );
        
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>What type of business?</Text>
            <Text style={styles.stepSubtitle}>
              This helps us customize features for you
            </Text>
            <View style={styles.optionsContainer}>
              {BUSINESS_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.optionButton,
                    businessType === type.value && styles.optionButtonSelected
                  ]}
                  onPress={() => setBusinessType(type.value)}
                >
                  <Text style={styles.optionIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.optionLabel,
                    businessType === type.value && styles.optionLabelSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );
        
      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Set your savings goal</Text>
            <Text style={styles.stepSubtitle}>
              Auto-save a percentage of daily revenue
            </Text>
            <View style={styles.savingsContainer}>
              <Text style={styles.savingsValue}>{autoSaveRate}%</Text>
              <Text style={styles.savingsLabel}>of daily revenue</Text>
            </View>
            <View style={styles.savingsOptions}>
              {[0, 5, 10, 15, 20].map((rate) => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.savingsOption,
                    autoSaveRate === rate && styles.savingsOptionSelected
                  ]}
                  onPress={() => setAutoSaveRate(rate)}
                >
                  <Text style={[
                    styles.savingsOptionText,
                    autoSaveRate === rate && styles.savingsOptionTextSelected
                  ]}>
                    {rate}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.savingsInfo}>
              You can change this anytime in settings. The money is yours and can be withdrawn monthly.
            </Text>
          </>
        );
        
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s === step && styles.progressDotActive,
                s < step && styles.progressDotCompleted
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.formContainer}>
        {renderStep()}

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}

        <View style={styles.buttonContainer}>
          {step > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleBack}
              disabled={isLoading}
            >
              <Text style={styles.buttonSecondaryText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.buttonPrimary,
              step === 1 && styles.buttonFull
            ]}
            onPress={handleNext}
            disabled={isLoading}
          >
            <Text style={styles.buttonPrimaryText}>
              {isLoading ? 'Setting up...' : step === 4 ? 'Complete Setup' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    padding: Spacing.xl,
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: Colors.primary,
  },
  formContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.xl,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: Typography.sizes.md,
    color: Colors.text,
    height: 56,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    gap: Spacing.md,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  optionIcon: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
  savingsContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  savingsValue: {
    fontSize: Typography.sizes.xxxxl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  savingsLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  savingsOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  savingsOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  savingsOptionText: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  savingsOptionTextSelected: {
    color: Colors.white,
  },
  savingsInfo: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  error: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 'auto',
    paddingTop: Spacing.xl,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonFull: {
    flex: 1,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonPrimaryText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: Colors.background,
  },
  buttonSecondaryText: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
});
