import { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { Colors, Typography, Spacing } from '@/styles/theme';

export default function SplashScreen() {
  const router = useRouter();
  const { isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    // Check authentication status
    checkAuth();
    
    // Auto-navigate after splash delay
    const timer = setTimeout(() => {
      // Navigation happens automatically via the root index
      // This is just for the visual splash delay
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>N</Text>
      </View>
      <Text style={styles.title}>Nest</Text>
      <Text style={styles.subtitle}>Financial OS for your business</Text>
      <Text style={styles.tagline}>Built for Kenya. Designed for the world.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  title: {
    fontSize: Typography.sizes.xxxl,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    opacity: 0.7,
    textAlign: 'center',
  },
});
