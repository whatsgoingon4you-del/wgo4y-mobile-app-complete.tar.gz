import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingStart() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectUserType();
  }, []);

  const detectUserType = async () => {
    try {
      // ALWAYS redirect to user-type-selection first
      // This allows users to confirm or change their type
      console.log('Legacy onboarding/step1 - redirecting to user-type-selection');
      router.replace('/onboarding/user-type-selection');
    } catch (error) {
      console.error('Error in onboarding redirect:', error);
      router.replace('/onboarding/user-type-selection');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#1565FF" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
