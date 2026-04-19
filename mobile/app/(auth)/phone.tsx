import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { Colors, Typography, Spacing } from '@/styles/theme';

export default function PhoneScreen() {
  const router = useRouter();
  const { sendOtp, isLoading, error, clearError } = useAuthStore();
  const [phone, setPhone] = useState('');

  const formatPhone = (text: string) => {
    // Remove non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Handle Kenyan format
    if (cleaned.startsWith('0') && cleaned.length <= 10) {
      return cleaned;
    } else if (cleaned.startsWith('254') && cleaned.length <= 12) {
      return cleaned;
    } else if (cleaned.startsWith('+254')) {
      return cleaned.substring(1);
    }
    
    return cleaned;
  };

  const handleContinue = async () => {
    clearError();
    
    let formattedPhone = phone;
    
    // Convert to +254 format
    if (phone.startsWith('0')) {
      formattedPhone = '+254' + phone.substring(1);
    } else if (phone.startsWith('254')) {
      formattedPhone = '+' + phone;
    } else if (!phone.startsWith('+')) {
      formattedPhone = '+254' + phone;
    }

    const success = await sendOtp(formattedPhone);
    
    if (success) {
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: formattedPhone }
      });
    }
  };

  const isValidPhone = phone.length >= 9;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Enter your phone number</Text>
        <Text style={styles.subtitle}>
          We'll send you a verification code to get started
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.countryCode}>+254</Text>
          <TextInput
            style={styles.input}
            placeholder="7XX XXX XXX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(text) => setPhone(formatPhone(text))}
            maxLength={12}
            editable={!isLoading}
          />
        </View>

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, (!isValidPhone || isLoading) && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!isValidPhone || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Sending...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    height: 56,
  },
  countryCode: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: '600',
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  error: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
  },
  terms: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
