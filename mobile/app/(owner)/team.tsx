import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '@/styles/theme';

export default function TeamScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Team Management</Text>
      <Text style={styles.subtitle}>Invite and manage cashiers...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
});
