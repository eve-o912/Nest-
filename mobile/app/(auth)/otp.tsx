import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { Colors, Typography, Spacing } from '@/styles/theme';

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp, sendOtp, isLoading, error, clearError } = useAuthStore();
  
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (text: string, index: number) => {
    if (text.length > 1) return; // Only single digits
    
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (index === 5 && text) {
      const fullCode = [...newCode.slice(0, 5), text].join('');
      handleVerify(fullCode);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode: string) => {
    clearError();
    
    const result = await verifyOtp(phone, fullCode);
    
    if (result.success) {
      if (result.isNewUser || !result.user?.businessId) {
        router.replace('/(auth)/setup');
      } else {
        router.replace('/');
      }
    }
  };

  const handleResend = async () => {
    clearError();
    const success = await sendOtp(phone);
    if (success) {
      setResendTimer(60);
    }
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    return phone.substring(0, 4) + ' *** ' + phone.substring(phone.length - 3);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to {maskPhone(phone)}
        </Text>

        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={el => inputRefs.current[index] = el}
              style={[styles.codeInput, digit && styles.codeInputFilled]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              editable={!isLoading}
              selectTextOnFocus
            />
          ))}
        </View>

        {error && (
          <Text style={styles.error}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, (isLoading || code.join('').length !== 6) && styles.buttonDisabled]}
          onPress={() => handleVerify(code.join(''))}
          disabled={isLoading || code.join('').length !== 6}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Verifying...' : 'Verify'}
          </Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          {resendTimer > 0 ? (
            <Text style={styles.resendText}>
              Resend code in {resendTimer}s
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={isLoading}>
              <Text style={styles.resendLink}>Resend code</Text>
            </TouchableOpacity>
          )}
        </View>
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    fontSize: Typography.sizes.xl,
    textAlign: 'center',
    color: Colors.text,
    fontWeight: '600',
  },
  codeInputFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  error: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.md,
    textAlign: 'center',
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
  resendContainer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  resendText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  resendLink: {
    fontSize: Typography.sizes.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
});
