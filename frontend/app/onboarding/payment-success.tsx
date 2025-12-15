import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'https://wgo4y-repair.preview.emergentagent.com';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<'checking' | 'success' | 'error' | 'timeout'>('checking');
  const [statusMessage, setStatusMessage] = useState('Verifying your payment...');
  const [tier, setTier] = useState('');
  const [trialDays, setTrialDays] = useState(0);

  useEffect(() => {
    // Get session_id from URL params
    const sessionId = params.session_id as string;
    
    if (sessionId) {
      pollPaymentStatus(sessionId, 0);
    } else {
      setStatus('error');
      setStatusMessage('No payment session found');
    }
  }, [params.session_id]);

  const pollPaymentStatus = async (sessionId: string, attempts: number) => {
    const maxAttempts = 10; // Increased from 5 to 10
    const pollInterval = 3000; // Increased to 3 seconds

    console.log(`🔍 Polling payment status (attempt ${attempts + 1}/${maxAttempts})`);
    console.log(`📋 Session ID: ${sessionId}`);

    if (attempts >= maxAttempts) {
      setStatus('timeout');
      setStatusMessage('Payment verification timed out. Your payment may have been processed. Please check your email or contact support.');
      return;
    }

    try {
      console.log(`🔐 Fetching status from: ${API_URL}/api/checkout/status/${sessionId}`);
      
      // No auth token needed - session_id is sufficient for security
      const response = await axios.get(
        `${API_URL}/api/checkout/status/${sessionId}`
      );

      const data = response.data;
      console.log('📊 Payment status response:', JSON.stringify(data, null, 2));

      if (data.payment_status === 'paid' && data.membership_updated) {
        // SUCCESS!
        console.log('✅ Payment confirmed and membership updated!');
        setStatus('success');
        setTier(data.tier);
        setTrialDays(data.trial_days || 0);
        setStatusMessage('Payment successful! Your membership has been upgraded.');
        
        // Wait 2 seconds then navigate based on context
        setTimeout(async () => {
          // Check if this is an upgrade from URL parameter (more reliable than AsyncStorage)
          const upgradeParam = params.upgrade === 'true' || params.upgrade === true;
          
          // Also check AsyncStorage flags as fallback
          const upgradeFromTier = await AsyncStorage.getItem('upgrade_from_tier');
          const upgradeToTier = await AsyncStorage.getItem('upgrade_to_tier');
          
          const isUpgrade = upgradeParam || (upgradeFromTier && upgradeToTier);
          
          if (isUpgrade) {
            // This is an upgrade, not initial onboarding
            console.log(`✅ UPGRADE COMPLETE (detected via ${upgradeParam ? 'URL param' : 'AsyncStorage'})`);
            
            // Clear upgrade flags if they exist
            if (upgradeFromTier && upgradeToTier) {
              await AsyncStorage.multiRemove(['upgrade_from_tier', 'upgrade_to_tier']);
            }
            
            // Update user tier in AsyncStorage
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
              const user = JSON.parse(userData);
              user.membership_tier = data.tier;
              await AsyncStorage.setItem('user', JSON.stringify(user));
            }
            
            // Navigate to dashboard (home) after upgrade, clearing navigation stack
            console.log('→ Redirecting to dashboard (upgrade complete)');
            router.replace('/(tabs)/home');
            return;
          }
          
          // Not an upgrade - this is initial onboarding, continue to onboarding flow
          const userData = await AsyncStorage.getItem('user');
          const user = userData ? JSON.parse(userData) : null;
          const userType = user?.user_type;
          
          console.log('🎯 Post-payment navigation for user_type:', userType);
          
          // Route to appropriate onboarding based on user type
          if (userType === 'entrepreneur') {
            console.log('→ Redirecting to entrepreneur onboarding');
            router.replace('/onboarding/entrepreneur/step0');
          } else if (userType === 'business') {
            console.log('→ Redirecting to business onboarding');
            router.replace('/onboarding/business/step1');
          } else {
            // General public goes to entertainment preferences
            console.log('→ Redirecting to entertainment preferences');
            router.replace('/onboarding/entertainment-preferences');
          }
        }, 2000);
        return;
      } else if (data.status === 'expired') {
        console.log('⏰ Session expired');
        setStatus('error');
        setStatusMessage('Payment session expired. Please try again.');
        return;
      } else if (data.payment_status === 'unpaid') {
        // Payment still pending, continue polling
        console.log('⏳ Payment still pending, continuing to poll...');
        setStatusMessage(`Processing payment... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
      } else {
        // Unknown status, continue polling
        console.log('❓ Unknown status, continuing to poll...', data);
        setStatusMessage(`Checking payment status... (${attempts + 1}/${maxAttempts})`);
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
      }
    } catch (error: any) {
      console.error('❌ Error checking payment status:', error);
      console.error('Error details:', error.response?.data);
      
      // If this is the last attempt, show error
      if (attempts >= maxAttempts - 1) {
        setStatus('error');
        const errorMsg = error.response?.data?.detail || error.message || 'Error verifying payment';
        setStatusMessage(errorMsg + '. Please contact support if payment was deducted.');
      } else {
        // Otherwise, retry
        console.log(`🔄 Retrying in ${pollInterval/1000} seconds...`);
        setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), pollInterval);
      }
    }
  };

  const getTierDisplayName = () => {
    const names: Record<string, string> = {
      'appreciation': 'Appreciation',
      'silver': 'Silver',
      'networking': 'Networking',
      'gold': 'Gold'
    };
    return names[tier] || tier;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          {status === 'checking' && (
            <ActivityIndicator size="large" color="#1565FF" />
          )}
          {status === 'success' && (
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
          )}
          {status === 'error' && (
            <Ionicons name="close-circle" size={80} color="#F44336" />
          )}
          {status === 'timeout' && (
            <Ionicons name="time-outline" size={80} color="#FF9800" />
          )}
        </View>

        {/* Status Message */}
        <Text style={styles.title}>
          {status === 'checking' && 'Processing...'}
          {status === 'success' && 'Welcome to WGO4Y!'}
          {status === 'error' && 'Payment Issue'}
          {status === 'timeout' && 'Verification Timeout'}
        </Text>

        <Text style={styles.message}>{statusMessage}</Text>

        {status === 'success' && (
          <View style={styles.successDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
              <Text style={styles.detailText}>
                {getTierDisplayName()} Membership Activated
              </Text>
            </View>
            
            {trialDays > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="gift" size={24} color="#4CAF50" />
                <Text style={styles.detailText}>
                  {trialDays} Days Free Trial Started
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Progress Indicator */}
        {status === 'checking' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    marginBottom: 32,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  successDetails: {
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1565FF',
  },
});
