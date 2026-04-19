import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';

export default function Index() {
  const { isAuthenticated, hasBusiness, user } = useAuthStore();

  // Not authenticated -> go to auth flow
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/splash" />;
  }

  // Authenticated but no business -> onboarding
  if (!hasBusiness) {
    return <Redirect href="/(auth)/setup" />;
  }

  // Has business -> role-based routing
  if (user?.role === 'owner') {
    return <Redirect href="/(owner)/dashboard" />;
  }

  // Cashier -> POS screen
  return <Redirect href="/(cashier)/pos" />;
}
