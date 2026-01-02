import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is authenticated, check onboarding status
        checkOnboardingStatus();
      } else {
        // Not authenticated, show welcome screen
        // Only redirect if not already there
        if (typeof window !== 'undefined' && window.location.pathname !== '/welcome') {
          router.replace('/welcome');
        }
      }
    }
  }, [loading, user]);

  const checkOnboardingStatus = async () => {
    try {
      console.log('🔍 Checking onboarding status for user:', user?.user_type);
      
      // CRITICAL: If profile is complete, ALWAYS go to home - no exceptions
      // This prevents completed users from ever being routed back to onboarding
      if (user?.profile_completed) {
        console.log('✅ Profile complete, going to home');
        router.replace('/(tabs)/home');
        return;
      }
      
      // Additional check: If user has a paid membership tier, they've completed onboarding
      // (Even if profile_completed flag is false, paid members should not see onboarding)
      const hasPaidTier = user?.membership_tier && 
        user.membership_tier !== 'basic' && 
        user.membership_tier !== 'free';
      
      if (hasPaidTier) {
        console.log('✅ User has paid tier, going to home (skipping onboarding)');
        router.replace('/(tabs)/home');
        return;
      }
      
      // Check if we have a confirmed user type selection (user explicitly chose to continue)
      const confirmedUserType = await AsyncStorage.getItem('onboarding_user_type_confirmed');
      
      // Check if user has completed new onboarding flow data
      const tier = await AsyncStorage.getItem('onboarding_tier');
      const preferences = await AsyncStorage.getItem('onboarding_entertainment_preferences');
      const photo = await AsyncStorage.getItem('onboarding_profile_photo');
      
      console.log('📋 Onboarding progress:', { 
        tier, 
        has_preferences: !!preferences, 
        has_photo: !!photo,
        confirmed: !!confirmedUserType 
      });
      
      // CRITICAL: If user hasn't confirmed their type, ALWAYS show user-type-selection first
      // This allows changing user type before any onboarding
      if (!confirmedUserType) {
        console.log('→ No confirmed user type, routing to user type selection');
        router.replace('/onboarding/user-type-selection');
        return;
      }
      
      // User has confirmed their type - now check onboarding progress
      
      // If user has tier selected (part of new flow), resume that flow
      if (tier) {
        console.log('✅ Found onboarding progress, resuming...');
        
        // Resume based on what's completed
        if (!preferences) {
          console.log('→ Resuming at: entertainment-preferences');
          router.replace('/onboarding/entertainment-preferences');
          return;
        } else if (!photo) {
          console.log('→ Resuming at: profile-photo');
          router.replace('/onboarding/profile-photo');
          return;
        } else {
          // Has everything but not yet saved to backend, go to photo screen to complete
          console.log('→ Has all data, going to profile-photo to complete');
          router.replace('/onboarding/profile-photo');
          return;
        }
      }
      
      // No tier saved, check if this is a business/entrepreneur that needs detailed onboarding
      console.log('⚠️ No onboarding progress found or incomplete profile');
      const hasOldOnboarding = user?.user_type === 'business' || user?.user_type === 'entrepreneur';
      
      if (hasOldOnboarding) {
        // Redirect to type-specific onboarding (old flow for businesses/entrepreneurs with detailed profiles)
        if (user?.user_type === 'business') {
          console.log('→ Going to business onboarding');
          router.replace('/onboarding/business/step1');
        } else if (user?.user_type === 'entrepreneur') {
          console.log('→ Going to entrepreneur onboarding');
          router.replace('/onboarding/entrepreneur/step0');
        }
      } else {
        // General public - should have tier selected first
        console.log('→ Starting new onboarding at tier selection');
        router.replace('/onboarding/tier-selection');
      }
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      // Fallback
      if (user?.profile_completed) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/onboarding/tier-selection');
      }
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1565FF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
