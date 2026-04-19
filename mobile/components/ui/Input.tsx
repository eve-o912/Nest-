import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, typography, spacing, radius } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  type?: 'text' | 'money' | 'phone';
  prefix?: string;
}

export function Input({
  label,
  error,
  type = 'text',
  prefix,
  style,
  ...textInputProps
}: InputProps) {
  const getKeyboardType = () => {
    switch (type) {
      case 'money':
        return 'numeric';
      case 'phone':
        return 'phone-pad';
      default:
        return 'default';
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputError : null,
          style as any,
        ]}
      >
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[
            styles.input,
            type === 'money' && styles.monoInput,
          ]}
          placeholderTextColor={colors.muted}
          keyboardType={getKeyboardType()}
          {...textInputProps}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sm,
    color: colors.sub,
    marginBottom: spacing.sm,
    fontFamily: typography.body,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputError: {
    borderColor: colors.red,
  },
  prefix: {
    fontSize: typography.base,
    color: colors.sub,
    marginRight: spacing.sm,
    fontFamily: typography.body,
  },
  input: {
    flex: 1,
    fontSize: typography.base,
    color: colors.text,
    fontFamily: typography.body,
    paddingVertical: spacing.md,
  },
  monoInput: {
    fontFamily: typography.mono,
  },
  errorText: {
    fontSize: typography.sm,
    color: colors.red,
    marginTop: spacing.sm,
    fontFamily: typography.body,
  },
});
